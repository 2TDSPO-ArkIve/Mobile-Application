import { apiGet } from './apiClient';

/**
 * `VeterinarioCustoResponse.ConsultaCusto` — confirmed field-for-field
 * against the current local Java source. Deliberately a SEPARATE type from
 * `PatientCostConsultation` (`AnimalCustoResponse.ConsultaCusto`): the two
 * are independently-defined Java records that happen to share a calculator
 * (`CustoAssistencialCalculator`), not the same DTO reused. This one carries
 * `animalId`/`animalNome`/`animalArkivePatientId` (which patient this
 * consultation belongs to) but no `status`/`statusDescricao` — every row
 * here is implicitly `FI`, by construction of the backend query
 * (`buscarCustosFinalizadosPorVeterinario` filters `status = 'FI'` itself).
 *
 * `valorConsulta` is the one nullable field — null means no value was
 * recorded for that consultation, never render it as `R$ 0,00`.
 * `valorMedicamentos`/`valorTotal` are server-computed per-row aggregates
 * and are always numbers (confirmed: `CustoAssistencialCalculator` defaults
 * a missing medication aggregate to `0.00` before summing).
 */
export interface VeterinarianCostConsultation {
  consultaId: number;
  dataHora: string;
  animalId: number;
  animalNome: string;
  animalArkivePatientId: string | null;
  valorConsulta: number | null;
  valorMedicamentos: number;
  valorTotal: number;
}

/**
 * `VeterinarioCustoResponse` — confirmed field-for-field. `totalConsultas`/
 * `totalMedicamentos`/`totalGeral` are always numbers (built from
 * `BigDecimal.ZERO`, never null, even with zero finalized consultations).
 *
 * IMPORTANT null/zero distinction confirmed in `CustoAssistencialCalculator`:
 * a consultation with a null `valorConsulta` is SKIPPED from `totalConsultas`
 * entirely (not added as zero) AND does not increment
 * `quantidadeConsultasComValor` — so `quantidadeConsultasComValor` can be
 * LESS than `consultas.length`. Never infer "no finalized consultations"
 * from `totalGeral === 0`; use `consultas.length === 0` for that (a
 * veterinarian can have finalized consultations with zero recorded values,
 * which is a legitimate, different state from having none at all).
 */
export interface VeterinarianCostSummary {
  veterinarioId: number;
  veterinarioNome: string;
  totalConsultas: number;
  totalMedicamentos: number;
  totalGeral: number;
  quantidadeConsultasComValor: number;
  quantidadePrescricoesComValor: number;
  consultas: VeterinarianCostConsultation[];
}

/**
 * `GET /api/veterinarios/me/custos` — confirmed `VeterinarioCustoController.buscar`
 * (`@RequestMapping("/api/veterinarios/me")` + `@GetMapping("/custos")`). The
 * ONLY method argument is the authenticated principal — no veterinarianId,
 * no query params, no date range exist on this endpoint; it is structurally
 * impossible to request another veterinarian's data through it. Aggregates
 * ONLY this veterinarian's own `FI` (finalizada) consultations — `AG`/`CA`
 * are excluded by the backend query itself, not by any client-side filter.
 */
export async function getOwnVeterinarianCosts(): Promise<VeterinarianCostSummary> {
  return apiGet<VeterinarianCostSummary>('/api/veterinarios/me/custos');
}
