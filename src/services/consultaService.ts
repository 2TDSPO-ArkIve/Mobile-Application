import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  ApiError,
  NetworkError,
  isTransientInfraError,
} from './apiClient';
import { LIST_PAGE_SIZE, type SpringPage } from '../utils/pagination';

/**
 * TEMPORARY diagnostic — sanitized (id, HTTP status, and the backend's own
 * safe business message; never narrative/diagnosis/AI content or auth).
 * Remove once the clinical-support 5xx is root-caused.
 */
function logAiDiagnostic(label: string, id: number, err: unknown): void {
  if (!__DEV__) return;
  if (err instanceof ApiError) {
    console.log(`[ai] ${label} status=${err.status} message=${err.message}`);
  } else if (err instanceof NetworkError) {
    console.log(`[ai] ${label} failed NetworkError consultaId=${id} (fetch rejected before any HTTP response)`);
  } else if (err instanceof Error) {
    console.log(`[ai] ${label} failed ${err.name} consultaId=${id}`);
  }
}

/** AG Agendada · EP Em Progresso · AP Aguardando Parecer · FI Finalizada · CA Cancelada */
export type ConsultaStatus = 'AG' | 'EP' | 'AP' | 'FI' | 'CA';

/** The only two values `ConsultaService.validarModalidadeObrigatoria` accepts. */
export type Modalidade = 'PRESENCIAL' | 'REMOTA';

/** The only values the veterinarian-authored severity fields accept (`FinalizarConsultaRequest`/`SalvarDiagnosticoRequest`). */
export type Severidade = 'LEVE' | 'MODERADA' | 'GRAVE';

/**
 * CONFIRMED against the ArkIve Spring Boot source (sibling project
 * `SPRINT-3/java-advanced`, `ConsultaResponse.java`) — every field here is a
 * direct match, not an inference.
 */
export interface ConsultaDto {
  id: number;
  dataHora: string;
  modalidade: Modalidade;
  motivo: string;
  sintomas: string | null;
  observacao: string | null;
  /** Chunk-1 addition (`ConsultaResponse.observacaoResponsavel`) — the responsible person's note for the next consultation. Display-only for now; the create/edit form for it is a later chunk. */
  observacaoResponsavel: string | null;
  peso: number | null;
  transcricao: string | null;
  status: ConsultaStatus;
  statusDescricao: string;
  animalId: number;
  animalNome: string;
  /** Chunk-1 addition (`ConsultaResponse.animalArkivePatientId`) — the patient's permanent ArkIve id, included directly so consultation UI can show it without a separate animal fetch. Use `patientArkiveIdLine`-style null-safety (never fall back to a numeric id) when rendering. */
  animalArkivePatientId: string | null;
  veterinarioId: number;
  veterinarioNome: string;
  clinicaId: number | null;
  clinicaNome: string | null;
  /** `ConsultaResponse.endereco` — Batch 2 addition, nullable. */
  endereco: string | null;
  /**
   * V13 addition (`Consulta.valorConsulta`). `null` means no cost was
   * recorded, OR (Chunk 1) that Java redacted it because the authenticated
   * veterinarian isn't the one who owns this consultation's financial
   * visibility — NEVER render either case as `R$ 0,00` (an explicitly
   * recorded `0` is a real, distinct value, and this app never tries to
   * distinguish "not recorded" from "redacted" — Java alone decides when
   * `null` is returned). Only ever meaningfully aggregated server-side for
   * `FI` consultations (see `patientCostService.ts`), but the field itself
   * can be present on any status since it's set at creation/edit time (AG),
   * before finalization.
   */
  valorConsulta: number | null;
}

/**
 * `ConsultaWorkflowResponse.java`, confirmed field-for-field against the
 * ACTUAL record — deliberately NOT `extends ConsultaDto`: this response does
 * NOT include `endereco` or `valorConsulta` at all (confirmed by reading the
 * record directly), unlike `ConsultaResponse`. Returned by `iniciar`
 * (AG->EP) and `finalizar` (->FI); callers needing `endereco`/`valorConsulta`
 * for a just-started/just-finalized consultation must still read them from
 * `useConsulta`'s own `ConsultaDto`, not from this response.
 */
export interface ConsultaWorkflowResponse {
  id: number;
  dataHora: string;
  modalidade: Modalidade;
  motivo: string;
  sintomas: string | null;
  observacao: string | null;
  observacaoResponsavel: string | null;
  peso: number | null;
  transcricao: string | null;
  status: ConsultaStatus;
  statusDescricao: string;
  animalId: number;
  animalNome: string;
  animalArkivePatientId: string | null;
  veterinarioId: number;
  veterinarioNome: string;
  clinicaId: number | null;
  clinicaNome: string | null;
  /** Set by `finalizar` (the confirmed diagnosis created alongside finalization); `null` for the `iniciar` (AG->EP) response. */
  diagnosticoId: number | null;
}

/**
 * `ConsultaRequest.java`. Used as-is for both create and update — Spring
 * reuses the same record for `POST /api/consultas` and `PUT /api/consultas/{id}`.
 *
 * `veterinarioId` is confirmed nullable in the backend record now
 * (`@NotNull` was removed) — Java's `AuthController`/`ConsultaService` derive
 * the veterinarian from the authenticated principal for a VETERINARIO
 * caller, so this app never sends it. It's kept here only as an optional
 * field for backward compatibility with the type shape, never populated by
 * any current caller — `GET /api/auth/me` exists for UI/session identity,
 * not so the client can echo an id back into a create/update payload.
 *
 * `status` is deliberately not a field here: the backend forces new
 * consultations to `AG` and rejects any PUT that changes status to
 * something else (`ConsultaService.validarStatusCriacaoOuAtualizacao`) — the
 * client should never send it either way.
 */
export interface ConsultaRequestInput {
  dataHora: string;
  modalidade: Modalidade;
  motivo: string;
  sintomas?: string;
  observacao?: string;
  peso?: number;
  transcricao?: string;
  animalId: number;
  veterinarioId?: number;
  /**
   * `ConsultaRequest.endereco` — Batch 2 addition, max 255 chars. On CREATE,
   * omitting/blank-ing this while `modalidade === 'PRESENCIAL'` lets the
   * backend snapshot the veterinarian's own clinic address itself
   * (`ConsultaService`: only when `criando`, blank, PRESENCIAL, and the vet
   * has a clinic) — this app never duplicates that lookup client-side.
   * `undefined`/blank is safe for create; see `UpdateConsultaInput`'s own
   * note for why that is NOT safe on a PUT.
   */
  endereco?: string;
  /**
   * V13 addition. Omitting this key (or sending explicit `null`) both mean
   * "no recorded cost" to Jackson — either is a safe way to clear a
   * previously-recorded value on a full-replace PUT. `EditConsultaScreen`'s
   * form field is always hydrated from the existing `valorConsulta` first, so
   * an untouched edit naturally round-trips the same number back rather than
   * ever accidentally omitting/clearing it.
   */
  valorConsulta?: number | null;
}

export type CreateConsultaInput = ConsultaRequestInput;

/**
 * Same request shape as create, because Spring's PUT is a full replace, not
 * a patch (`ConsultaService.aplicarDados` is shared between create/update).
 * `animalId`/`veterinarioId` (and clinicaId, not exposed here) must match
 * the consultation's current values exactly — `exigirAssociacoesImutaveis`
 * returns 409 otherwise. `EditConsultaScreen` never sends `veterinarioId`
 * (the backend fills it from the consultation's current value when omitted)
 * and always echoes the existing `animalId` back unchanged.
 *
 * CRITICAL for `endereco` specifically: the clinic-address auto-snapshot
 * ONLY applies `criando` (create) — confirmed in `ConsultaService`, the
 * blank-endereco fallback is gated on `criando && ...`. On a PUT, an
 * omitted/blank `endereco` is NOT backfilled from the clinic; it simply
 * clears the field (`vazioParaNulo(request.endereco())`). `EditConsultaScreen`
 * hydrates `endereco` (and every other field it doesn't expose in its own
 * form) from the existing `ConsultaDto` and only sends a different value
 * when the veterinarian actually changed it.
 */
export type UpdateConsultaInput = ConsultaRequestInput;

/** `AtualizarNarrativaConsultaRequest.java` — confirmed, not called yet (narrative editor is a future phase). */
export interface AtualizarNarrativaRequest {
  narrativa: string;
}

/**
 * `ClinicalSupportResponse.java`. `severidadeSugerida` is intentionally a
 * plain `string`: `ClinicalSupportService.validarResultado` only checks the
 * external engine's output is non-blank, it does NOT constrain it to the
 * LEVE/MODERADA/GRAVE set — unlike the veterinarian-authored `Severidade`
 * above, the AI's severity vocabulary is not confirmed.
 */
export interface ClinicalSupportResponse {
  /** The underlying `Diagnostico` record id — the target of `PATCH /api/diagnosticos/{diagnosticoId}/validacao-veterinaria` (see `avaliarInsightIa` in diagnosticoService.ts). */
  diagnosticoId: number;
  consultaId: number;
  statusConsulta: ConsultaStatus;
  statusDescricao: string;
  hipoteseDiagnostica: string;
  severidadeSugerida: string;
  insightClinico: string;
  confianca: number | null;
  /**
   * null = the veterinarian has not evaluated this AI insight yet; 'S'/'N' =
   * marked useful/not useful via `avaliarInsightIa`. NOT the same concept as
   * a confirmed diagnosis (`DiagnosticoDto.confirmado`) — this is feedback on
   * the AI's analysis, never a diagnosis confirmation/rejection.
   */
  validacaoVet: 'S' | 'N' | null;
  /**
   * V4 addition — external research sources the clinical engine consulted,
   * persisted server-side (survives AP/FI/reopen). Optional because a
   * currently-deployed backend may not have this field yet; every caller
   * must normalize with `support.fontesPesquisadas ?? []`, never assume
   * presence. Whether this is empty/populated is entirely the clinical
   * engine's decision — never derive it from `confianca` on the client.
   */
  fontesPesquisadas?: string[];
  /**
   * Human-readable titles from the local RAG knowledge base (never literal
   * `.md` filenames — Java returns the real document title). Chunk-1 change:
   * each entry is now a structured `{fonte, titulo}` object (was a plain
   * `string[]`) — `fonte` is the source/organization abbreviation Java
   * confirmed (e.g. "ABCD"), nullable; `titulo` is always a non-blank string
   * (`ClinicalSupportResponse.normalizarReferenciasRag` filters out any entry
   * without one before it ever reaches this response). Never fabricate a
   * full organization name from `fonte` — display it exactly as returned, or
   * omit it when null. Same defensive optionality as `fontesPesquisadas` for
   * a backend predating this field; normalize with
   * `support.referenciasRag ?? []`. A distinct concept from
   * `fontesPesquisadas` (external web sources) — never merge the two lists.
   */
  referenciasRag?: RagReference[];
}

/** `RagReferenceResponse.java` — one entry in `ClinicalSupportResponse.referenciasRag`. */
export interface RagReference {
  /** Source/organization abbreviation as confirmed by the clinical engine (e.g. "ABCD") — never expand/guess the full name. */
  fonte: string | null;
  titulo: string;
}

/** `FinalizarConsultaRequest.java` — the veterinarian's conclusion, confirmed, not called yet. */
export interface FinalizarConsultaRequest {
  diagnostico: string;
  severidade?: Severidade;
  doencaId?: number | null;
  conclusao?: string;
}

/** `CancelarConsultaRequest.java`. */
export interface CancelarConsultaRequest {
  motivo: string;
}

/** `GET /api/consultas` returns a Spring Data `Page`, not a bare array — unwrap `.content`. */
export async function listConsultas(): Promise<ConsultaDto[]> {
  const page = await apiGet<{ content: ConsultaDto[] }>('/api/consultas');
  return page.content;
}

/**
 * One page of one status group (`ConsultasScreen`). `ConsultaRepository.buscar`
 * has no `order by`, so `sort=id,desc` keeps pages stable (newest first).
 */
export async function listConsultasByStatus(
  status: ConsultaStatus,
  page: number
): Promise<SpringPage<ConsultaDto>> {
  return apiGet<SpringPage<ConsultaDto>>(
    `/api/consultas?status=${status}&page=${page}&size=${LIST_PAGE_SIZE}&sort=id,desc`
  );
}

/** How many consultations have this status — reads only `totalElements` from a 1-item page. */
export async function countConsultasByStatus(status: ConsultaStatus): Promise<number> {
  const page = await apiGet<SpringPage<ConsultaDto>>(`/api/consultas?status=${status}&page=0&size=1`);
  return page.totalElements;
}

/** Confirmed: `ConsultaController.buscarPorId`, `@GetMapping("/{id}")`. */
export async function getConsulta(id: number): Promise<ConsultaDto> {
  return apiGet<ConsultaDto>(`/api/consultas/${id}`);
}

export async function createConsulta(input: CreateConsultaInput): Promise<ConsultaDto> {
  return apiPost<ConsultaDto>('/api/consultas', input);
}

/** Full-replace PUT — see the confidence note on UpdateConsultaInput. Called from `EditConsultaScreen` via `useUpdateConsulta`. */
export async function updateConsulta(
  id: number,
  input: UpdateConsultaInput
): Promise<ConsultaDto> {
  return apiPut<ConsultaDto>(`/api/consultas/${id}`, input);
}

/**
 * Confirmed backend rule (`ConsultaService.excluir`): only a consultation
 * still `AG` may be deleted — anything else returns 409. This is not a
 * client-side UX guess; enforce the same restriction in the UI so the
 * button doesn't invite a request the server will always reject.
 */
export async function deleteConsulta(id: number): Promise<void> {
  await apiDelete<void>(`/api/consultas/${id}`);
}

/** AG -> EP. No request body. Returns the updated consultation, but callers should still invalidate + refetch rather than trust this payload directly. */
export async function startConsulta(id: number): Promise<ConsultaWorkflowResponse> {
  return apiPost<ConsultaWorkflowResponse>(`/api/consultas/${id}/iniciar`);
}

/**
 * Confirmed: `GET /api/consultas/{id}/suporte-clinico` only reads whatever
 * was already persisted — `ClinicalSupportService.buscarSuporte` never calls
 * the external engine.
 */
export async function getClinicalSupport(id: number): Promise<ClinicalSupportResponse> {
  if (__DEV__) console.log(`[ai] recovery GET start consultaId=${id}`);
  try {
    const result = await apiGet<ClinicalSupportResponse>(`/api/consultas/${id}/suporte-clinico`);
    if (__DEV__) console.log(`[ai] recovery GET status=200 consultaId=${id}`);
    return result;
  } catch (err) {
    logAiDiagnostic('recovery GET', id, err);
    throw err;
  }
}

/**
 * A 404 from `getClinicalSupport` does not necessarily mean support will
 * never exist — confirmed physical race: right after generation POSTs 200,
 * the very next GET can still 404 briefly before the write is visible to a
 * read. For a consultation whose workflow already moved past EP (AP or FI),
 * persisted support is expected sooner or later, so a 404 there reads the
 * same as a transient infra hiccup: keep loading and retry, never a hard
 * failure card. Only ever call this GET's caller sites for AP/FI/insight
 * contexts — that's what makes treating 404 as transient safe here.
 */
export function isSupportNotYetPersisted(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 404) return true;
  return isTransientInfraError(error);
}

/**
 * Confirmed: `ConsultaWorkflowService.atualizarNarrativa` accepts this while
 * the consultation is EP *or* AP, and stores the text on `Consulta.transcricao`
 * (the request field is called `narrativa`; the field holding the same text
 * on every response DTO is `transcricao` — not a naming mismatch, two
 * different DTOs for two different directions).
 *
 * Only ever call this via useSaveNarrativa from ConsultaDetailScreen's
 * handleAnalyze, awaited to completion before ever navigating to the
 * screen that calls requestClinicalSupport — never in parallel with it.
 */
export async function updateNarrativa(
  id: number,
  narrativa: string
): Promise<ConsultaWorkflowResponse> {
  return apiPatch<ConsultaWorkflowResponse>(`/api/consultas/${id}/narrativa`, { narrativa });
}

/**
 * POST, no request body — the backend reads the persisted consultation
 * directly from Oracle, so whatever narrative text is in the database at
 * call time is what the Clinical Engine sees. Never call this without
 * having already awaited a successful updateNarrativa for any new text.
 */
export async function requestClinicalSupport(id: number): Promise<ClinicalSupportResponse> {
  if (__DEV__) console.log(`[ai] support request start consultaId=${id}`);
  try {
    const result = await apiPost<ClinicalSupportResponse>(`/api/consultas/${id}/suporte-clinico`);
    if (__DEV__) console.log(`[ai] support response status=200 consultaId=${id}`);
    return result;
  } catch (err) {
    logAiDiagnostic('support response', id, err);
    throw err;
  }
}

/**
 * Confirmed: `ConsultaStatusTransitionPolicy` permits both `EP->FI` and
 * `AP->FI` server-side (the controller's own doc string says so explicitly:
 * "O suporte ArkIve e opcional: EP pode seguir diretamente para FI."). Chunk 4
 * uses this from BOTH paths — `ClinicalIntake`'s "Prosseguir sem análise
 * ArkIve" action navigates straight from EP to `ConclusaoVeterinaria`, and
 * `ArkiveInsightScreen`'s existing "Registrar minha conclusão" still reaches
 * it from AP after clinical support. The same `VeterinarianConclusionForm`/
 * `finalizeConsulta` call is reused unmodified for both — the backend doesn't
 * distinguish them beyond the transition policy above.
 *
 * `doencaId` is always sent as `null` from this app: there is no `/api/doencas`
 * (or equivalent) REST endpoint anywhere in the backend for a mobile client
 * to look one up, and DiagnosticoService confirms it's optional (nullable).
 * Never invent/hardcode a numeric doencaId.
 */
export async function finalizeConsulta(
  id: number,
  input: FinalizarConsultaRequest
): Promise<ConsultaWorkflowResponse> {
  return apiPost<ConsultaWorkflowResponse>(`/api/consultas/${id}/finalizar`, input);
}

/**
 * `POST /api/consultas/{id}/cancelar` — confirmed `ConsultaWorkflowService.cancelar`
 * allows AG/EP/AP -> CA (never FI/CA, both rejected with 400, not 409 —
 * Java's own `BusinessException` default status). `motivo` is `@NotBlank`
 * both at the DTO and redundantly in the service; a 400 here is always a
 * validation/bad-status rejection, never a transient race to retry. Java
 * prepends `"Cancelamento: " + motivo` into the consultation's own
 * `observacao` field — there is no separate "cancellation reason" field to
 * read back; render `consulta.observacao` for a CA consultation same as it's
 * already rendered for FI.
 */
export async function cancelConsulta(
  id: number,
  input: CancelarConsultaRequest
): Promise<ConsultaWorkflowResponse> {
  return apiPost<ConsultaWorkflowResponse>(`/api/consultas/${id}/cancelar`, input);
}
