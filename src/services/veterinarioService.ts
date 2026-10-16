import { apiGet } from './apiClient';

/**
 * Confirmed against `VeterinarioResponse.java`. No `telefone` field exists
 * on this DTO at all — never fabricate one.
 */
export interface VeterinarioDto {
  id: number;
  nome: string;
  crmv: string;
  especialidade: string | null;
  email: string;
  clinicaId: number | null;
  clinicaNome: string | null;
  ativo: 'S' | 'N';
}

/**
 * `GET /api/veterinarios/me` (Chunk 1 addition, confirmed in
 * `VeterinarioController.buscarPerfilAutenticado` /
 * `VeterinarioService.buscarPerfilAutenticado`) — derives the veterinarian
 * exclusively from the authenticated principal; it takes NO id and must
 * never be sent one. This REPLACES the previous self-profile lookup via
 * `GET /api/veterinarios/{id}`: that by-id route is now confirmed
 * SYSADMIN-only in `SecurityConfig` (`/api/veterinarios/**` requires
 * `SYSADMIN`, separate from the explicit `VETERINARIO`-only rule on
 * `/api/veterinarios/me`), so a normal veterinarian calling it now gets 403 —
 * this app must never call the by-id endpoint for a veterinarian's own
 * profile again.
 */
export async function getOwnVeterinario(): Promise<VeterinarioDto> {
  return apiGet<VeterinarioDto>('/api/veterinarios/me');
}
