import { apiGet } from './apiClient';
import type { ConsultaStatus } from './consultaService';

/**
 * One finalized (`FI`) consultation's contribution to the cost summary.
 * `valorConsulta`/`valorMedicamentos` are individual recorded amounts and
 * CAN be `null` (no cost recorded for that piece) — never render that as
 * `R$ 0,00`. `valorTotal` is a server-computed aggregate for this row and is
 * always a number (the backend treats a missing piece as zero when summing,
 * per the documented contract) — this app never recomputes it client-side.
 */
export interface PatientCostConsultation {
  consultaId: number;
  dataHora: string;
  status: ConsultaStatus;
  statusDescricao: string;
  valorConsulta: number | null;
  valorMedicamentos: number | null;
  valorTotal: number;
}

/**
 * `AnimalCustosResponse` (conceptual name) — confirmed backend behavior:
 * only `FI` consultations appear in `consultas`/contribute to the totals;
 * `totalConsultas`/`totalMedicamentos`/`totalGeral` are server-computed
 * aggregates (NULL treated as zero during aggregation) and are always
 * numbers, even when every individual recorded value is null (a patient
 * with finalized consultations but zero recorded costs legitimately shows
 * all-zero totals, not an error state).
 */
export interface PatientCostResponse {
  animalId: number;
  arkivePatientId: string | null;
  animalNome: string;
  totalConsultas: number;
  totalMedicamentos: number;
  totalGeral: number;
  quantidadeConsultasComValor: number;
  quantidadePrescricoesComValor: number;
  consultas: PatientCostConsultation[];
}

/**
 * `GET /api/animais/{animalId}/custos` — authenticated and authorized by
 * Java for both VETERINARIO and RESPONSAVEL, same as the history endpoint;
 * this app adds no extra client-side restriction of its own.
 */
export async function getPatientCosts(animalId: number): Promise<PatientCostResponse> {
  return apiGet<PatientCostResponse>(`/api/animais/${animalId}/custos`);
}
