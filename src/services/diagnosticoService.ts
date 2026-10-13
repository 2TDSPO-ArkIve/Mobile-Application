import { apiGet, apiPatch } from './apiClient';

/**
 * CONFIRMED against `DiagnosticoResponse.java`. `confirmado` distinguishes a
 * veterinarian-confirmed record (`DiagnosticoService.criarConfirmadoPeloVeterinario`:
 * confirmado="S", insightIa/confianca left null) from an AI-provisional one
 * (`criarSuporteClinicoIa`: confirmado="N", insightIa/confianca populated). A
 * consultation can have both records once finalized — never assume "the
 * first one" is the right one; always filter by `confirmado`.
 *
 * `validacaoVet` is a SEPARATE concept from `confirmado` — it is the
 * veterinarian's feedback on whether the AI-provisional insight was useful
 * (null = not yet rated, 'S'/'N' = rated useful/not useful via
 * `avaliarInsightIa`), never a diagnosis confirmation/rejection.
 */
export interface DiagnosticoDto {
  id: number;
  diagnostico: string;
  severidade: string | null;
  confirmado: 'S' | 'N';
  insightIa: string | null;
  confianca: number | null;
  validacaoVet: 'S' | 'N' | null;
  consultaId: number;
  doencaId: number | null;
}

/**
 * `GET /api/diagnosticos?consultaId=X` — confirmed scoped server-side per
 * role (`DiagnosticoService.listarAutorizado`). Also a Spring Data `Page`.
 */
export async function listDiagnosticosByConsulta(consultaId: number): Promise<DiagnosticoDto[]> {
  const page = await apiGet<{ content: DiagnosticoDto[] }>(
    `/api/diagnosticos?consultaId=${consultaId}`
  );
  return page.content;
}

/** The veterinarian's own confirmed conclusion for this consultation, if one has been recorded. */
export function findConfirmedDiagnosis(
  diagnosticos: DiagnosticoDto[]
): DiagnosticoDto | undefined {
  return diagnosticos.find((item) => item.confirmado === 'S');
}

/**
 * `PATCH /api/diagnosticos/{diagnosticoId}/validacao-veterinaria` —
 * veterinarian feedback on an AI-generated insight ("was this useful?"),
 * never a diagnosis confirmation. Deliberately sends `{ util }` (a plain
 * boolean), never a raw `{ validacaoVet: 'S' | 'N' }` — Java owns the S/N
 * database translation; the frontend only ever expresses the yes/no
 * question. Returns the updated `DiagnosticoDto`, including the new
 * `validacaoVet`.
 */
export async function avaliarInsightIa(
  diagnosticoId: number,
  util: boolean
): Promise<DiagnosticoDto> {
  return apiPatch<DiagnosticoDto>(`/api/diagnosticos/${diagnosticoId}/validacao-veterinaria`, { util });
}
