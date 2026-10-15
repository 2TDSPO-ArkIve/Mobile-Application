import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

/** Confirmed: `PrescricaoService.VIAS_ADMINISTRACAO` — the only 6 values the backend accepts. */
export type ViaAdministracao = 'ORAL' | 'INJETAVEL' | 'TOPICO' | 'OCULAR' | 'OTOLOGICO' | 'OUTRO';

/** CONFIRMED against `PrescricaoResponse.java` — matches the product brief's example exactly, field for field. */
export interface PrescricaoDto {
  id: number;
  medicamento: string;
  dosagem: string;
  frequencia: string | null;
  viaAdministracao: ViaAdministracao | null;
  dataInicio: string;
  dataFim: string | null;
  instrucoes: string | null;
  consultaId: number;
  /**
   * V13 addition (`Prescricao.valorMedicamento`) — the TOTAL cost associated
   * with this prescription/treatment, never a per-unit price. `null` means
   * no cost was recorded, OR (Chunk 1) that Java redacted it for financial-
   * privacy reasons (another veterinarian's record) — this app never tries
   * to distinguish the two; either way, never render `null` as `R$ 0,00`.
   */
  valorMedicamento: number | null;
}

/**
 * Same request shape for create and update — `PrescricaoService.aplicarDados`/
 * `aplicarTratamento` share every field. `consultaId` is required in both
 * bodies, but on update it must exactly equal the prescription's current
 * consultaId (`exigirMesmaConsulta` returns 409 otherwise) — so this app
 * always carries it forward from the existing record, never lets the
 * veterinarian type or change it.
 */
export interface PrescricaoRequestInput {
  medicamento: string;
  dosagem: string;
  frequencia?: string;
  viaAdministracao?: ViaAdministracao;
  dataInicio: string;
  dataFim?: string;
  instrucoes?: string;
  consultaId: number;
  /** V13 addition — same omit-or-null-to-clear semantics as `ConsultaRequestInput.valorConsulta`; `PrescricaoForm` always hydrates its field from the existing value, so an untouched edit round-trips it unchanged. */
  valorMedicamento?: number | null;
}

/**
 * `GET /api/prescricoes?consultaId=X` — confirmed scoped server-side per
 * role (`PrescricaoService.listarAutorizado`). Also a Spring Data `Page`.
 */
export async function listPrescricoesByConsulta(consultaId: number): Promise<PrescricaoDto[]> {
  const page = await apiGet<{ content: PrescricaoDto[] }>(
    `/api/prescricoes?consultaId=${consultaId}`
  );
  return page.content;
}

export async function getPrescricao(id: number): Promise<PrescricaoDto> {
  return apiGet<PrescricaoDto>(`/api/prescricoes/${id}`);
}

/**
 * Confirmed: `PrescricaoService.criar` calls `exigirConsultaFinalizada` —
 * 400 "Prescricao so pode ser criada para consulta finalizada." if the
 * associated consultation isn't `FI`. The UI in NewPrescricaoScreen also
 * checks this before ever showing the form, but the backend check is what
 * actually matters — it can't be bypassed by skipping the client check.
 */
export async function createPrescricao(input: PrescricaoRequestInput): Promise<PrescricaoDto> {
  return apiPost<PrescricaoDto>('/api/prescricoes', input);
}

/**
 * Full replace, confirmed (`PrescricaoService.atualizar` reuses the same
 * `PrescricaoRequest` as create). Confirmed blocked entirely — 409 — once
 * an adherence record exists for this prescription (`exigirSemAdesaoRegistrada`).
 */
export async function updatePrescricao(
  id: number,
  input: PrescricaoRequestInput
): Promise<PrescricaoDto> {
  return apiPut<PrescricaoDto>(`/api/prescricoes/${id}`, input);
}

/** Same adherence restriction as update, confirmed in `PrescricaoService.excluir`. */
export async function deletePrescricao(id: number): Promise<void> {
  await apiDelete<void>(`/api/prescricoes/${id}`);
}
