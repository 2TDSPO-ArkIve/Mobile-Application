import { apiGet, apiPost } from './apiClient';

/** Confirmed: `RacaResponse.java`. */
export interface RacaDto {
  id: number;
  nome: string;
  porte: string | null;
  especieId: number;
  especieNome: string;
  ativo: 'S' | 'N';
}

/** The only values `RacaService.validarPorte` accepts (blank/omitted is also valid — porte is optional). */
export type Porte = 'PEQUENO' | 'MEDIO' | 'GRANDE';

/** `RacaRequest.java` — `nome`/`especieId` required, `porte` optional. Used only for create in this app (no breed-edit UI). */
export interface RacaRequestInput {
  nome: string;
  especieId: number;
  porte?: Porte | null;
}

/**
 * `GET /api/racas` — confirmed to support `especieId` filtering server-side
 * (`RacaController.listar` / `RacaService.listar`), so the breed picker only
 * ever loads breeds that actually belong to the selected species instead of
 * a client-side filter over every breed in the system. `nome` is a
 * server-side case-insensitive "contains" filter (`RacaRepository.buscar`).
 */
export async function listRacas(especieId: number, nome?: string): Promise<RacaDto[]> {
  const nomeParam = nome ? `&nome=${encodeURIComponent(nome)}` : '';
  const page = await apiGet<{ content: RacaDto[] }>(
    `/api/racas?especieId=${especieId}&size=200${nomeParam}`
  );
  return page.content;
}

/**
 * `POST /api/racas` — CONFIRMED VETERINARIO-allowed (`SecurityConfig`:
 * `POST /api/racas` → `hasAnyRole("SYSADMIN", "ADMIN_CLINICA", "VETERINARIO")`),
 * letting a vet register a missing breed inline during patient registration
 * instead of being blocked by a closed catalog. A duplicate name within the
 * same species returns 409 with a specific, human-readable message
 * (`RacaService.aplicarDados`/`salvar`) — shown verbatim, like the password
 * policy messages elsewhere in this app.
 */
export async function createRaca(input: RacaRequestInput): Promise<RacaDto> {
  return apiPost<RacaDto>('/api/racas', input);
}
