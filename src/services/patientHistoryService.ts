import { apiGet, apiGetBinary } from './apiClient';
import { InvalidPdfError } from './consultaPdfService';
import { slugifyFilenamePart } from '../utils/pdfHandoff';
import type { ConsultaStatus, Modalidade } from './consultaService';

/** `AnimalHistoricoResponse.paciente` — the patient summary the history screen's header renders. */
export interface AnimalHistoryPatient {
  id: number;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: string | null;
  castrado: string | null;
  dataNascimento: string | null;
  responsavelNome: string | null;
}

/** One prescription under a finalized consultation — only ever present when the consultation itself is `FI`. */
export interface AnimalHistoryPrescription {
  medicamento: string;
  dosagem: string | null;
  frequencia: string | null;
  viaAdministracao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  instrucoes: string | null;
  /** V13 additive field — `null` means no cost was recorded; never render that as `R$ 0,00`. */
  valorMedicamento: number | null;
}

/**
 * One consultation row in the timeline. `diagnosticoConfirmado`/
 * `severidadeFinal`/`conclusao`/`prescricoes` are only ever populated by Java
 * for a finalized (`status === 'FI'`) consultation — a non-finalized entry
 * can still appear (confirmed backend behavior) but without that final
 * clinical data. This type does not encode that as a conditional/union on
 * purpose: the backend is the sole authority on what's present for a given
 * status, and the UI simply renders whatever fields it receives rather than
 * branching on `status === 'FI'` to decide what SHOULD be there.
 */
export interface AnimalHistoryConsultation {
  dataHora: string;
  modalidade: Modalidade;
  endereco: string | null;
  motivo: string | null;
  status: ConsultaStatus;
  statusDescricao: string;
  veterinarioNome: string | null;
  crmv: string | null;
  clinicaNome: string | null;
  diagnosticoConfirmado: string | null;
  severidadeFinal: string | null;
  conclusao: string | null;
  prescricoes: AnimalHistoryPrescription[];
  /** V13 additive field (`ConsultaHistorico.valorConsulta`) — `null` means no cost was recorded; never render that as `R$ 0,00`. */
  valorConsulta: number | null;
}

/** `AnimalHistoricoResponse.java` — confirmed: `consultas` is always newest-first, already scoped to what the authenticated caller may read. */
export interface AnimalHistoryResponse {
  paciente: AnimalHistoryPatient;
  consultas: AnimalHistoryConsultation[];
}

/**
 * `GET /api/animais/{animalId}/historico` — authenticated and authorized by
 * Java for both VETERINARIO and RESPONSAVEL; this app never adds its own
 * extra access restriction on top (see `PatientHistoryScreen`'s own note).
 */
export async function getPatientHistory(animalId: number): Promise<AnimalHistoryResponse> {
  return apiGet<AnimalHistoryResponse>(`/api/animais/${animalId}/historico`);
}

/**
 * `GET /api/animais/{animalId}/historico-pdf` — same `application/pdf` +
 * `Cache-Control: no-store` contract as `downloadConsultaResumoPdf`. Java
 * owns the whole document; this never reconstructs history content into a
 * PDF client-side.
 */
export async function downloadPatientHistoryPdf(
  animalId: number
): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  const { data, contentType } = await apiGetBinary(`/api/animais/${animalId}/historico-pdf`);

  if (!contentType || !contentType.toLowerCase().includes('application/pdf')) {
    throw new InvalidPdfError();
  }
  if (data.byteLength === 0) {
    throw new InvalidPdfError();
  }

  return { bytes: new Uint8Array(data), contentType };
}

/** `arkive-historico-epona.pdf` when a safe patient name is available, falling back to `arkive-historico-123.pdf` otherwise. */
export function buildPatientHistoryPdfFilename(animalId: number, animalNome?: string | null): string {
  const slug = slugifyFilenamePart(animalNome);
  return slug ? `arkive-historico-${slug}.pdf` : `arkive-historico-${animalId}.pdf`;
}
