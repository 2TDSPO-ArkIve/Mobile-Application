import { useQuery } from '@tanstack/react-query';
import { getOwnVeterinario } from '../services/veterinarioService';
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
