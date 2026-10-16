import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRequestClinicalSupport } from './useConsultas';
import { getClinicalSupport, getConsulta, type ConsultaStatus } from '../services/consultaService';
import { ApiError, isTransientInfraError } from '../services/apiClient';
import { describeClinicalSupportError } from '../utils/errorMessages';
import { t } from '../i18n/store';
import { queryKeys } from '../query/queryKeys';

/**
 * Chunk 4 additions: `completed` (a confirmed, persisted GET succeeded —
 * the ONLY reliable "generation is done" signal; see its own note on why
 * this replaced using bare `idle` for that purpose), `canceled` (the
 * consultation was canceled — confirmed via a real status read, never
 * inferred from a 409 alone), `unavailable` (the consultation is in a
 * status — AG, or FI with nothing ever generated — where ArkIve analysis
 * simply doesn't apply; not a failure, not a cancellation, just nothing to
 * do here), and `uncertain` (a bounded recovery window elapsed with no
 * definitive answer — Java's own read timeout to the clinical engine is
 * ~120s, and there is no backend processing-status endpoint, so this app
 * cannot honestly promise an eventual result forever; it offers a manual
 * recheck/retry instead of polling silently without end).
 */
export type GenerationPhase = 'idle' | 'analyzing' | 'completed' | 'error' | 'uncertain' | 'canceled' | 'unavailable';

/**
 * Statuses the clinical engine's own cold-start/wake cycle can legitimately
 * produce and that must NOT read as a hard failure: 500/502/503/504 (engine
 * asleep/restarting/erroring transiently), a `NetworkError` (the request
 * itself never got a response), and 409 (`ClinicalSupportService.gerarSuporte`'s
 * `consultasEmProcessamento` guard — generation is already running, OR —
 * confirmed in the current Java source — "the consultation's status changed
 * before persistence", e.g. a cancellation mid-flight; the two causes share
 * one HTTP status code). ALL of these are treated identically here: never an
 * automatic second POST, always a real status read followed by GET-only
 * recovery (`handleNonEpStatus` + `waitForPersistedSupport`) — see
 * `runGeneration`'s own note. Everything else (400/401/403/404/422/other
 * validation-or-auth) is a real, non-transient failure.
 */
function isTransientSupportError(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 409) return true;
  return isTransientInfraError(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `not-found` is a CONFIRMED, clean 404 — Java explicitly saying no support
 * record exists. `transient` is a 5xx/network failure on the read itself,
 * which proves nothing either way (the record may exist and simply be
 * unreachable right now). Collapsing these two into one bucket was exactly
 * the bug in the AP/FI correction: a transient read failure must never be
 * interpreted as a confirmed absence.
 */
type PersistedCheckResult =
  | { status: 'found' }
  | { status: 'not-found' }
  | { status: 'transient' }
  | { status: 'error'; error: unknown };

// Used both (a) after a 409 ("already generating server-side", confirmed via
// a real status read — see above) and (b) after a 200 from the generation
// POST itself: a 200 only confirms the engine call completed, NOT that the
// persisted result is readable yet — confirmed physical race where the very
// next GET can still briefly 404. Bounded by MAX_POLL_ATTEMPTS below, not
// infinite — see the module doc comment on `uncertain`.
const POLL_INTERVAL_MS = 4500;
// ~3 minutes of GET-only polling (no new POST) — a generous window beyond
// Java's own 120s read timeout for whatever attempt is genuinely still
// in flight, without polling forever with no escape.
const MAX_POLL_ATTEMPTS = 40;

const SLOW_THRESHOLD_MS = 30000;

// Bounded recovery specifically for an AP/FI consultation's persisted-support
// read — a different physical phenomenon than EP's "is Python still
// running" wait (Java has already fully decided the outcome by AP/FI), so a
// short, fast-retrying window is enough to ride out read-after-write
// visibility lag or a brief infra hiccup, without waiting minutes for
// something that isn't actually still being computed.
const RESOLVED_STATUS_RECOVERY_ATTEMPTS = 6;
const RESOLVED_STATUS_RECOVERY_INTERVAL_MS = 2000;

/**
 * Owns clinical-support generation + cold-start recovery for an
 * already-persisted consultation. Issues AT MOST ONE generation POST per
 * explicit call (`generate()`/the initial mount) — a lost HTTP response
 * never triggers an automatic second POST, since Java's call to the
 * external engine is synchronous and may still be running server-side.
 * Recovery from there is GET-only and bounded, not infinite: it polls for a
 * persisted result for a reasonable window, then reaches `uncertain` — an
 * honest "can't confirm either way" state with a manual recheck/retry action
 * — rather than spinning forever. It reaches `error` only for a genuine
 * non-transient failure (permission/validation/not-found), `canceled` the
 * moment a real status read confirms the consultation moved to CA, and
 * `unavailable` when the consultation is in a status (AG, or FI reached
 * without ever generating support) where ArkIve analysis simply doesn't
 * apply.
 */
export function useClinicalSupportGeneration(consultaId: number) {
  const requestSupport = useRequestClinicalSupport(consultaId);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Signals "this is taking longer than usual" without ending the analyzing
  // phase — purely informational, never a failure state.
  const [isSlow, setIsSlow] = useState(false);

  // Guards state updates against a screen that unmounted, or a newer run
  // that superseded this one. A pending setTimeout/mutation from an old run
  // still fires, but every continuation checks `isCurrent` before touching
  // state, so it's inert — this is also how "the user left" cleanly stops
  // every timer/loop without any extra bookkeeping.
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearSlowTimer();
    };
  }, [clearSlowTimer]);

  const isCurrent = useCallback((runId: number) => mountedRef.current && runId === runIdRef.current, []);

  /**
   * `completed` — NOT `idle` — is the only phase a caller may treat as proof
   * that a persisted result exists. Using bare `idle` for this used to create
   * a real race in `ArkiveAnalysisScreen`: on mount, two effects fire in the
   * same passive-effect flush; the first synchronously calls `generate()`
   * (which calls `setPhase('analyzing')`), but that state update is only
   * applied on the NEXT render — the second effect, running in the SAME
   * flush, still reads the stale `idle` from the initial render and could
   * navigate to Insight before generation ever started. `idle` now means
   * ONLY "never started yet"; it is never reached again after the first
   * `generate()` call.
   */
  const finishSuccess = useCallback(() => {
    clearSlowTimer();
    queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(consultaId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
    queryClient.invalidateQueries({ queryKey: queryKeys.consultas.clinicalSupport(consultaId) });
    setIsSlow(false);
    setPhase('completed');
    setErrorMessage(null);
  }, [consultaId, queryClient, clearSlowTimer]);

  const finishError = useCallback(
    (message: string) => {
      clearSlowTimer();
      setIsSlow(false);
      setPhase('error');
      setErrorMessage(message);
    },
    [clearSlowTimer]
  );

  const finishCanceled = useCallback(() => {
    clearSlowTimer();
    setIsSlow(false);
    setPhase('canceled');
    setErrorMessage(null);
  }, [clearSlowTimer]);

  /**
   * `'generating'` (default) — EP's own generation/poll window elapsed with
   * no definitive answer; `'retrieval'` — a persisted AP/FI result could
   * never be cleanly confirmed as present or absent (bounded 404/transient
   * retries exhausted). These are different honest claims and must not share
   * the same copy: nothing is "still being generated" for an AP/FI
   * consultation — Java already decided that outcome; this is purely a
   * read-back problem.
   */
  const finishUncertain = useCallback(
    (reason: 'generating' | 'retrieval' = 'generating') => {
      clearSlowTimer();
      setIsSlow(false);
      setPhase('uncertain');
      setErrorMessage(
        reason === 'retrieval' ? t('aiAnalysis.retrievalUncertainMessage') : t('aiAnalysis.uncertainMessage')
      );
    },
    [clearSlowTimer]
  );

  /** AG (not started yet) or FI with nothing ever generated (the EP->FI-without-ArkIve path) — not a failure, not a cancellation, just nothing for this screen to recover or show. */
  const finishUnavailable = useCallback(() => {
    clearSlowTimer();
    setIsSlow(false);
    setPhase('unavailable');
    setErrorMessage(null);
  }, [clearSlowTimer]);

  /** Read-only recovery check — never triggers generation (confirmed: `buscarSuporte` never calls the external engine). Distinguishes a CONFIRMED 404 (`not-found`) from a `transient` infra hiccup on the read itself (proves nothing) and from a genuine, non-transient failure (`error`, e.g. 401/403/422) — the latter must stop any loop immediately, never be swallowed into "keep trying". */
  const checkPersisted = useCallback(async (): Promise<PersistedCheckResult> => {
    try {
      await getClinicalSupport(consultaId);
      return { status: 'found' };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return { status: 'not-found' };
      if (isTransientInfraError(err)) return { status: 'transient' };
      return { status: 'error', error: err };
    }
  }, [consultaId]);

  /**
   * The ONLY reliable way to tell "still processing" apart from "status
   * changed" (both share the same 409 from the generation POST), and the
   * mechanism that notices a cancellation issued from a completely
   * different screen (e.g. `CancelConsultaModal` on `ConsultaDetailScreen`)
   * while this hook is mid-recovery. Also seeds the `consultas.detail`
   * query cache with the fresh read, so leaving this screen immediately
   * after a detected cancellation shows the real CA state rather than a
   * stale cached EP.
   */
  const checkConsultaStatus = useCallback(async (): Promise<ConsultaStatus | null> => {
    try {
      const consulta = await getConsulta(consultaId);
      queryClient.setQueryData(queryKeys.consultas.detail(consultaId), consulta);
      return consulta.status;
    } catch {
      return null;
    }
  }, [consultaId, queryClient]);

  /**
   * Bounded, READ-ONLY recovery for an AP or FI consultation's persisted
   * support — never issues a generation POST (Java has already fully
   * decided the outcome by the time a consultation reaches either status;
   * there is nothing left for Mobile to trigger). The two statuses have
   * different ground truths and must not be treated the same:
   *
   * - AP: Java always persists clinical support BEFORE transitioning EP->AP
   *   (confirmed in `ClinicalSupportPersistenceService` — the record exists
   *   by construction). A 404/5xx/network failure here is read-visibility
   *   lag or infra flakiness, never evidence the result is actually absent.
   *   A confirmed 404 is therefore treated exactly like `transient` — both
   *   are retried, and if the bound is exhausted, this reaches `uncertain`
   *   (an actionable retrieval problem with a GET-only recheck), NEVER
   *   `unavailable`.
   * - FI: may have been reached via AP->FI (support exists) or directly
   *   from EP without ArkIve (support was never generated — a real, legit
   *   case). A CONFIRMED, clean 404 is trusted immediately as "no analysis
   *   was performed" (`unavailable`). A `transient` failure proves nothing
   *   either way and is retried, bounded, reaching `uncertain` (never a
   *   false `unavailable`) if it never resolves cleanly.
   *
   * Either way, a non-transient/non-404 error (401/403/422/...) stops
   * immediately on the first occurrence — never retried — and the
   * consultation's real status is rechecked between attempts so a
   * cancellation that happens mid-recovery (AP->CA) is still caught.
   */
  const recoverResolvedStatusSupport = useCallback(
    async (runId: number, status: 'AP' | 'FI') => {
      for (let attempt = 0; attempt < RESOLVED_STATUS_RECOVERY_ATTEMPTS; attempt++) {
        const result = await checkPersisted();
        if (!isCurrent(runId)) return;

        if (result.status === 'found') {
          finishSuccess();
          return;
        }
        if (result.status === 'error') {
          finishError(describeClinicalSupportError(result.error));
          return;
        }
        if (result.status === 'not-found' && status === 'FI') {
          // A clean, confirmed 404 for FI is trusted immediately — this is
          // the legitimate "finalized without ArkIve" outcome, not an error
          // and not something to keep probing.
          finishUnavailable();
          return;
        }
        // Remaining cases: `transient` (either status), or a confirmed
        // `not-found` for AP (unexpected per Java's own invariant — treated
        // as a retrieval problem to retry, never a confirmed absence).
        const currentStatus = await checkConsultaStatus();
        if (!isCurrent(runId)) return;
        if (currentStatus === 'CA') {
          finishCanceled();
          return;
        }
        if (attempt < RESOLVED_STATUS_RECOVERY_ATTEMPTS - 1) {
          await sleep(RESOLVED_STATUS_RECOVERY_INTERVAL_MS);
        }
      }
      // Exhausted without ever getting a clean, trustworthy answer — an
      // actionable retrieval problem, never silently declared `unavailable`
      // when absence was never actually confirmed.
      finishUncertain('retrieval');
    },
    [isCurrent, checkPersisted, checkConsultaStatus, finishSuccess, finishError, finishCanceled, finishUnavailable, finishUncertain]
  );

  /**
   * Central status gate, covering the full AG/EP/AP/FI/CA matrix. EP is the
   * only status where generation may legitimately still be running or newly
   * starting — every other status means "stop, never POST, never keep
   * polling for an active generation," with per-status handling for what
   * (if anything) to show:
   * - CA: canceled, full stop.
   * - AP/FI: see `recoverResolvedStatusSupport` — bounded, read-only,
   *   status-aware recovery, never a POST (Java's own `gerarSuporte`
   *   AP-branch would happily return the cached result too, but a plain GET
   *   is the correct, lighter-weight way to ask "is there anything to show").
   * - AG: nothing has happened yet; nothing to recover.
   * - EP (or an unreadable/unknown status): not handled here — the caller
   *   proceeds with its normal POST/GET flow.
   * Returns `true` when it fully resolved the outcome (caller should stop).
   */
  const handleNonEpStatus = useCallback(
    async (runId: number, status: ConsultaStatus): Promise<boolean> => {
      if (status === 'CA') {
        finishCanceled();
        return true;
      }
      if (status === 'AP' || status === 'FI') {
        await recoverResolvedStatusSupport(runId, status);
        return true;
      }
      if (status === 'AG') {
        finishUnavailable();
        return true;
      }
      return false;
    },
    [finishCanceled, finishUnavailable, recoverResolvedStatusSupport]
  );

  /**
   * GET-only recovery loop, bounded by `MAX_POLL_ATTEMPTS` — used after a
   * POST either succeeded (200, but not-yet-visible is a confirmed physical
   * race) or hit a transient/409 condition where Java's ORIGINAL call may
   * still be running server-side. This function NEVER issues a POST itself
   * — it only reads (`checkPersisted`/`checkConsultaStatus`), which is what
   * makes it safe to use for "maybe still processing" without ever risking
   * an overlapping generation request. Checks immediately (so a POST 200
   * that already persisted doesn't waste a full poll interval), then polls
   * until the GET confirms support is readable, a real error surfaces, a
   * real status read resolves the consultation into a non-EP state (see
   * `handleNonEpStatus`), or the bound is reached (`uncertain`).
   */
  const waitForPersistedSupport = useCallback(
    async (runId: number) => {
      let attempts = 0;
      while (isCurrent(runId)) {
        const result = await checkPersisted();
        if (!isCurrent(runId)) return;
        if (result.status === 'found') {
          finishSuccess();
          return;
        }
        if (result.status === 'error') {
          finishError(describeClinicalSupportError(result.error));
          return;
        }

        const status = await checkConsultaStatus();
        if (!isCurrent(runId)) return;
        if (status && (await handleNonEpStatus(runId, status))) return;
        if (!isCurrent(runId)) return;

        attempts += 1;
        if (attempts >= MAX_POLL_ATTEMPTS) {
          finishUncertain();
          return;
        }
        await sleep(POLL_INTERVAL_MS);
      }
    },
    [isCurrent, checkPersisted, checkConsultaStatus, handleNonEpStatus, finishSuccess, finishError, finishUncertain]
  );

  /**
   * Issues AT MOST ONE generation POST per call — never an automatic retry
   * loop. Java's clinical-support call to Python is synchronous, so a lost
   * HTTP response (timeout, dropped connection, 5xx) does NOT prove the
   * server-side attempt failed; it may still be running, or may already
   * have persisted a result. The only safe thing to do with that
   * uncertainty is read-only recovery (`waitForPersistedSupport`), never a
   * second POST — overlapping generation requests are exactly what Java's
   * own 409 guard exists to prevent, and this hook must not provoke that
   * guard itself. A fresh POST only ever happens again via an explicit new
   * call to `generate()` (a real user action), which itself re-checks
   * server state first (see `generate`'s own note) rather than blindly
   * reusing whatever this run last believed.
   */
  const runGeneration = useCallback(
    async (runId: number) => {
      try {
        await requestSupport.mutateAsync();
        if (!isCurrent(runId)) return;
        // A 200 here is NOT enough to leave `analyzing` — confirm the
        // result is actually readable via the safe GET first, staying in
        // `analyzing` (no failure flash) until it is.
        await waitForPersistedSupport(runId);
        return;
      } catch (err) {
        if (!isCurrent(runId)) return;

        if (!isTransientSupportError(err)) {
          // A "wrong status" 400 can itself mean the consultation was
          // canceled (or otherwise moved on) out from under us right before
          // this POST — confirm via a real status read rather than showing
          // a confusing generic validation error for what is actually a
          // resolved state.
          const status = await checkConsultaStatus();
          if (!isCurrent(runId)) return;
          if (status && (await handleNonEpStatus(runId, status))) return;
          if (!isCurrent(runId)) return;
          finishError(describeClinicalSupportError(err));
          return;
        }

        // Both remaining cases — a 409 (see `isTransientSupportError`'s doc
        // comment: it means EITHER "already generating" OR "status changed
        // before persistence", never assume which) and an engine-side
        // transient failure (500/502/503/504/network) — are handled
        // IDENTICALLY from here on: confirm real status, then fall into
        // GET-only recovery. Neither path ever issues a second POST
        // automatically.
        const status = await checkConsultaStatus();
        if (!isCurrent(runId)) return;
        if (status && (await handleNonEpStatus(runId, status))) return;
        if (!isCurrent(runId)) return;
        await waitForPersistedSupport(runId);
      }
    },
    [requestSupport, isCurrent, finishError, handleNonEpStatus, checkConsultaStatus, waitForPersistedSupport]
  );

  /**
   * Chunk 4 — reopening this screen (or mounting it fresh) no longer jumps
   * straight to a POST. It first asks Java what's actually true (status,
   * then persisted support) and only falls through to `runGeneration`
   * (which may or may not need to POST — a 409 there is itself informative)
   * when there's genuinely nothing to recover. This is what makes "leave
   * mid-generation and come back" show a safe recovery/checking state
   * instead of blindly launching a second generation attempt.
   */
  const generate = useCallback(() => {
    // Guards against a double-invocation (e.g. a screen effect re-firing)
    // starting a second, concurrent generation run.
    if (phase === 'analyzing') return;
    setErrorMessage(null);
    setIsSlow(false);
    setPhase('analyzing');
    const runId = ++runIdRef.current;
    clearSlowTimer();
    slowTimerRef.current = setTimeout(() => {
      if (isCurrent(runId)) setIsSlow(true);
    }, SLOW_THRESHOLD_MS);

    void (async () => {
      const status = await checkConsultaStatus();
      if (!isCurrent(runId)) return;
      if (status && (await handleNonEpStatus(runId, status))) return;
      if (!isCurrent(runId)) return;

      const result = await checkPersisted();
      if (!isCurrent(runId)) return;
      if (result.status === 'found') {
        finishSuccess();
        return;
      }

      await runGeneration(runId);
    })();
  }, [phase, isCurrent, clearSlowTimer, checkConsultaStatus, checkPersisted, handleNonEpStatus, finishSuccess, runGeneration]);

  /**
   * A lighter-weight action for the `uncertain` phase: re-checks reality
   * (status + persisted support) without issuing a new POST — exactly the
   * "Verificar novamente" action the honest-progress requirement calls for,
   * distinct from `generate()`'s "Tentar novamente" (which may re-POST).
   *
   * Deliberately has NO `phase === 'analyzing'` guard (unlike `generate`):
   * this is also the mechanism a caller uses to force an immediate
   * re-evaluation right after confirming a cancellation elsewhere (e.g.
   * `CancelConsultaModal`'s `onCancelled`), which must be able to interrupt
   * an in-progress recovery loop rather than being a no-op while one is
   * running. Bumping `runId` here naturally supersedes whatever the
   * previous run was doing — its next `isCurrent` check simply stops it.
   */
  const recheck = useCallback(() => {
    setErrorMessage(null);
    setIsSlow(false);
    setPhase('analyzing');
    const runId = ++runIdRef.current;
    clearSlowTimer();

    void (async () => {
      const status = await checkConsultaStatus();
      if (!isCurrent(runId)) return;
      if (status && (await handleNonEpStatus(runId, status))) return;
      if (!isCurrent(runId)) return;

      const result = await checkPersisted();
      if (!isCurrent(runId)) return;
      if (result.status === 'found') {
        finishSuccess();
        return;
      }
      if (result.status === 'error') {
        finishError(describeClinicalSupportError(result.error));
        return;
      }

      finishUncertain();
    })();
  }, [isCurrent, clearSlowTimer, checkConsultaStatus, checkPersisted, handleNonEpStatus, finishSuccess, finishError, finishUncertain]);

  return { phase, errorMessage, isSlow, generate, recheck };
}
