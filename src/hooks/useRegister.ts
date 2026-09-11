import { useMutation } from '@tanstack/react-query';
import { registerVeterinario, type VeterinarioRegistrationInput } from '../services/authService';

/**
 * No query invalidation on success — registration happens entirely before
 * any authenticated session exists, so there is no cache for it to affect.
 */
export function useRegisterVeterinario() {
  return useMutation({
    mutationFn: (input: VeterinarioRegistrationInput) => registerVeterinario(input),
  });
}
