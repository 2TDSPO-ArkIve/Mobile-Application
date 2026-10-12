import { useMutation } from '@tanstack/react-query';
import {
  registerVeterinario,
  registerResponsavel,
  type VeterinarioRegistrationInput,
  type ResponsavelRegistrationInput,
} from '../services/authService';

/**
 * No query invalidation on success — registration happens entirely before
 * any authenticated session exists, so there is no cache for it to affect.
 */
export function useRegisterVeterinario() {
  return useMutation({
    mutationFn: (input: VeterinarioRegistrationInput) => registerVeterinario(input),
  });
}

/** Same reasoning as `useRegisterVeterinario` — no authenticated cache exists yet to invalidate. */
export function useRegisterResponsavel() {
  return useMutation({
    mutationFn: (input: ResponsavelRegistrationInput) => registerResponsavel(input),
  });
}
