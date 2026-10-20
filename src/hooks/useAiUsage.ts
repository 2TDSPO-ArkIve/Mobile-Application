import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getClinicalSupport,
  listRecentConsultasByStatusForAiUsage,
  type ConsultaDto,
} from '../services/consultaService';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from './useAuth';

/**
 * How many recent AP/FI consultations are considered as candidates for the
 * comparison sample — NOT how many will necessarily have recorded tokens
 * (some may 404/lack `tokens.total` and are silently excluded). A small,
 * explicit, platform-independent bound, separate from any UI pagination size.
 */
export const AI_USAGE_CANDIDATE_LIMIT = 10;

export interface AiUsageEntry {
  consulta: ConsultaDto;
  tokensTotal: number;
}

export interface AiUsageSample {
  /** Newest-first, already excludes `excludeConsultaId` and anything without a recorded `tokens.total`. */
  entries: AiUsageEntry[];
  sampleSize: number;
  totalTokens: number;
  /** `null` only when `sampleSize === 0` — never `0` by coincidence vs. "no data" (a genuine average of 0 IS a real, valid number and would be returned as `0`, not `null`). */
  averageTokens: number | null;
  isPending: boolean;
}

/**
 * Shared retrieval for BOTH the pre-diagnosis comparison on
 * `ClinicalSupportCard` and the "Uso da IA" settings screen — same candidate
 * selection, same exclusion/aggregation rules, so the two surfaces can never
 * silently disagree on what counts as "the recent sample".
 *
 * Only `AP`/`FI` consultations are considered (`AG`/`EP`/`CA` can never have
 * generated clinical support — confirmed: `ClinicalSupportService.buscarSuporte`
 * only ever finds something for a consultation that has actually been through
 * the `suporte-clinico` POST, which only ever happens from EP, producing AP,
 * and surviving through to FI). Up to `AI_USAGE_CANDIDATE_LIMIT` per status are
 * fetched (a small, fixed-size, unfiltered list — see
 * `listRecentConsultasByStatusForAiUsage`), merged, sorted newest-first by
 * `id` (the same recency proxy `sort=id,desc` already uses elsewhere), and
 * trimmed back down to `AI_USAGE_CANDIDATE_LIMIT` overall BEFORE any
 * per-consultation support fetch — so the number of `suporte-clinico` GETs
 * this hook can ever issue is bounded at exactly that limit, never the full
 * raw candidate pool.
 *
 * Each candidate's `GET /api/consultas/{id}/suporte-clinico` reuses the EXACT
 * SAME query key `useConsultaClinicalSupport`/`ConsultaDetailScreen`/
 * `ArkiveInsightScreen` already populate — a consultation the veterinarian
 * already opened costs this hook nothing extra. `retry: false`: a 404 here
 * (no AI support ever generated for that consultation) is a normal, EXPECTED
 * outcome, never retried, and is simply excluded from the sample — never
 * surfaced as an error, never treated as "zero tokens used". This hook never
 * calls `requestClinicalSupport` (the POST) — only the read-only GET.
 */
export function useRecentAiUsageSample(excludeConsultaId?: number): AiUsageSample {
  const { status } = useAuth();
  const enabled = status === 'authenticated';

  const apList = useQuery({
    queryKey: queryKeys.consultas.aiUsageCandidates('AP', AI_USAGE_CANDIDATE_LIMIT),
    queryFn: () => listRecentConsultasByStatusForAiUsage('AP', AI_USAGE_CANDIDATE_LIMIT),
    enabled,
  });
  const fiList = useQuery({
    queryKey: queryKeys.consultas.aiUsageCandidates('FI', AI_USAGE_CANDIDATE_LIMIT),
    queryFn: () => listRecentConsultasByStatusForAiUsage('FI', AI_USAGE_CANDIDATE_LIMIT),
    enabled,
  });

  const candidates = useMemo(() => {
    const merged = [...(apList.data ?? []), ...(fiList.data ?? [])];
    merged.sort((a, b) => b.id - a.id);
    const withoutCurrent =
      excludeConsultaId != null ? merged.filter((consulta) => consulta.id !== excludeConsultaId) : merged;
    return withoutCurrent.slice(0, AI_USAGE_CANDIDATE_LIMIT);
  }, [apList.data, fiList.data, excludeConsultaId]);

  const supportQueries = useQueries({
    queries: candidates.map((consulta) => ({
      queryKey: queryKeys.consultas.clinicalSupport(consulta.id),
      queryFn: () => getClinicalSupport(consulta.id),
      enabled,
      retry: false,
    })),
  });

  const entries: AiUsageEntry[] = candidates
    .map((consulta, index) => {
      const tokensTotal = supportQueries[index]?.data?.tokens?.total;
      // `!= null` (not plain truthiness) — a genuinely recorded `0` must
      // count as real data, never mistaken for "missing".
      return tokensTotal != null ? { consulta, tokensTotal } : null;
    })
    .filter((entry): entry is AiUsageEntry => entry != null);

  const totalTokens = entries.reduce((sum, entry) => sum + entry.tokensTotal, 0);

  return {
    entries,
    sampleSize: entries.length,
    totalTokens,
    averageTokens: entries.length > 0 ? totalTokens / entries.length : null,
    isPending: apList.isPending || fiList.isPending || supportQueries.some((query) => query.isPending),
  };
}
