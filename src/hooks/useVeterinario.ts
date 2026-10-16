import { useQuery } from '@tanstack/react-query';
import { getOwnVeterinario } from '../services/veterinarioService';
import { getOwnVeterinarianCosts } from '../services/veterinarioCustoService';
import { useAuth } from './useAuth';
import { queryKeys } from '../query/queryKeys';

/**
 * Resolves the authenticated veterinarian's own real profile (name, email,
 * CRMV, especialidade when available, clinic name when available) for
 * display — never fabricated, never editable here (profile editing is a
 * later chunk).
 *
 * `GET /api/veterinarios/me` (Chunk 1) derives the veterinarian exclusively
 * from the authenticated principal — no id is sent or needed, so this hook
 * no longer depends on `AuthContext`'s `identity.veterinarioId` at all; it
 * only needs to know the session is authenticated.
 */
export function useOwnVeterinario() {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.veterinarios.me(),
    queryFn: () => getOwnVeterinario(),
    enabled: status === 'authenticated',
  });
}

/**
 * Chunk 6 — the authenticated veterinarian's own financial dashboard
 * (`GET /api/veterinarios/me/custos`). No parameters are accepted or needed:
 * the endpoint derives the veterinarian exclusively from the authenticated
 * principal, same invariant as `useOwnVeterinario` above — there is no way
 * for this hook (or the screen using it) to request another veterinarian's
 * data, by construction.
 */
export function useOwnVeterinarianCosts() {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.veterinarios.ownCosts(),
    queryFn: () => getOwnVeterinarianCosts(),
    enabled: status === 'authenticated',
  });
}
