import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPatient,
  getPatientById,
  listAccessibleAnimals,
  listMyPatients,
  updatePatient,
  type AnimalRequestInput,
  type MyPatientsFilters,
} from '../services/patientService';
import { getPatientHistory } from '../services/patientHistoryService';
import { queryKeys } from '../query/queryKeys';

/** This veterinarian's own patient registry (`GET /api/animais/me`) — registered by them, previously consulted, or same-clinic if they have one; no prior-consultation requirement, no clinic requirement. */
export function useMyPatients(filters?: MyPatientsFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.patients.mine(filters),
    queryFn: () => listMyPatients(filters),
    enabled: options?.enabled ?? true,
  });
}

/**
 * This RESPONSAVEL's backend-authorized animal list (`GET /api/animais`, no
 * suffix — see `listAccessibleAnimals`'s own confirmation note). Deliberately
 * a separate hook from `useMyPatients`, which is VETERINARIO-specific and
 * calls a different endpoint with a different authorization meaning.
 */
export function useMyAnimals(filters?: MyPatientsFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.patients.accessible(filters),
    queryFn: () => listAccessibleAnimals(filters),
    enabled: options?.enabled ?? true,
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => getPatientById(id),
    enabled: Number.isFinite(id),
  });
}

/**
 * Read-only clinical timeline (`GET /api/animais/{id}/historico`) — scoped to
 * this one `animalId` via the query key, so there is no way for one
 * patient's cached history to leak into another's. Available to BOTH
 * VETERINARIO and RESPONSAVEL; Java is the sole authority on whether the
 * current caller may read a given animal's history, this hook adds no extra
 * client-side restriction of its own. No polling — this is a point-in-time
 * read, refetched normally (focus/mount) like every other query here.
 */
export function usePatientHistory(animalId: number) {
  return useQuery({
    queryKey: queryKeys.patients.history(animalId),
    queryFn: () => getPatientHistory(animalId),
    enabled: Number.isFinite(animalId),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AnimalRequestInput) => createPatient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

export function useUpdatePatient(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AnimalRequestInput) => updatePatient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}
