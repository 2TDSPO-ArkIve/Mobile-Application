import { apiGet, apiPost } from './apiClient';

/**
 * Confirmed against `RelatoAnimalResponse.java` (new Java V18 feature,
 * static field-for-field check — the migration has not been applied to
 * Oracle yet, so this has not been exercised against a live response).
 * `animalArkivePatientId`/`dataOcorrencia` are nullable on the Java record
 * (a `String`/`LocalDate` with no `@NotNull`), so both are typed `| null`
 * here even though the entity always has a name/arkive-id in practice.
 *
 * This is a PERMANENT record, deliberately separate from
 * `AnimalObservationDto` (`observacao-responsavel` — a single pending note
 * Java snapshots into one consultation and clears on AG->EP). Never merge
 * the two: different storage, different Java endpoint, different lifecycle,
 * no update/delete endpoint exists for a report at all.
 */
export interface AnimalReportDto {
  id: number;
  animalId: number;
  animalNome: string;
  animalArkivePatientId: string | null;
  responsavelId: number;
  responsavelNome: string;
  texto: string;
  /** `LocalDateTime` ISO string — when the report was submitted. */
  dataCriacao: string;
  /** `LocalDate` ISO (`YYYY-MM-DD`) or `null` — when the reported event actually happened, distinct from `dataCriacao`. */
  dataOcorrencia: string | null;
  /**
   * `true` only means voice transcription contributed to this report's text
   * at save time — never treated as a verified-accuracy claim about the
   * transcript itself (the Responsible always reviews/edits before saving).
   */
  originadoDeTranscricao: boolean;
}

export interface ListAnimalReportsParams {
  /** Case-/accent-insensitive substring search, performed in Oracle — confirmed via `RelatoSearchNormalizer`, never a partial client-side list filter. Max 100 chars (`CriarRelatoAnimalRequest`'s sibling `@Size` on the controller's `busca` param). */
  busca?: string;
  /** Default 0. */
  page?: number;
  /** Default 20, max 50 (`RelatoAnimalController`). */
  size?: number;
}

/** A Spring Data `Page<RelatoAnimalResponse>` — unwrapped fields only, same convention `notificationService.ts` already established for a paged list. */
export interface AnimalReportPage {
  content: AnimalReportDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateAnimalReportInput {
  /** Trimmed, non-blank, max 2000 chars — Java re-validates all of this (`RelatoAnimalService.validarTexto`) regardless. */
  texto: string;
  /** `YYYY-MM-DD`, optional. Never in the future (Java rejects it; this app also blocks it client-side via `DateField`'s `maximumDate`). */
  dataOcorrencia?: string;
  /** Required by Java (`@NotNull` on `CriarRelatoAnimalRequest`) — always sent explicitly, never omitted. */
  originadoDeTranscricao: boolean;
}

function buildListQuery(params?: ListAnimalReportsParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.busca) search.set('busca', params.busca);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.size !== undefined) search.set('size', String(params.size));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * `GET /api/animais/{animalId}/relatos` — confirmed Java authorization:
 * `ClinicalAccessService.exigirLeituraAnimal`, the exact same rule
 * `GET /api/animais/{id}/historico`/`/custos` already use, so both
 * VETERINARIO and RESPONSAVEL with legitimate access (including via an
 * approved access request) can read — never gated further client-side.
 */
export async function listAnimalReports(
  animalId: number,
  params?: ListAnimalReportsParams
): Promise<AnimalReportPage> {
  return apiGet<AnimalReportPage>(`/api/animais/${animalId}/relatos${buildListQuery(params)}`);
}

/**
 * `POST /api/animais/{animalId}/relatos` — confirmed RESPONSAVEL-only at the
 * Spring Security filter chain level, and further gated in the service by
 * `exigirCriacaoRelatoResponsavel` (an ACTIVE, currently-vigente
 * `AnimalResponsavel` link — same vinculo rule `observacao-responsavel`
 * uses). Returns 201 with the persisted report; 409 if the animal is
 * inactive, 400 for a blank/oversized text or a future `dataOcorrencia`.
 */
export async function createAnimalReport(
  animalId: number,
  input: CreateAnimalReportInput
): Promise<AnimalReportDto> {
  return apiPost<AnimalReportDto>(`/api/animais/${animalId}/relatos`, input);
}
