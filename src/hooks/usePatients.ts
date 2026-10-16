import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPatient,
  getAnimalObservation,
  getPatientById,
  getPatientByArkiveId,
  listAccessibleAnimals,
  listMyPatients,
  updateAnimalObservation,
  updatePatient,
  type AnimalRequestInput,
  type MyPatientsFilters,
} from '../services/patientService';
import { getPatientHistory } from '../services/patientHistoryService';
import { getPatientCosts } from '../services/patientCostService';
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

/**
 * Read-only cost dashboard (`GET /api/animais/{id}/custos`) — same scoping/
 * authorization notes as `usePatientHistory` above. No polling; a point-in-
 * time read, refetched normally (focus/mount) and additionally invalidated
 * by prescription create/update/delete and consultation finalization (see
 * `usePrescricoes.ts`/`useConsultas.ts` — both are the only mutations that
 * can change what this endpoint aggregates).
 */
export function usePatientCosts(animalId: number) {
  return useQuery({
    queryKey: queryKeys.patients.costs(animalId),
    queryFn: () => getPatientCosts(animalId),
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

/**
 * RESPONSAVEL-only pending note for one animal (`GET
 * /api/animais/{id}/observacao-responsavel`) — scoped by `animalId` in the
 * query key so it can never be read back for the wrong animal. Refetches
 * normally on mount/focus like every other read here, rather than assuming
 * a cached value from a previous visit is still current.
 */
export function useAnimalObservation(animalId: number) {
  return useQuery({
    queryKey: queryKeys.patients.observacao(animalId),
    queryFn: () => getAnimalObservation(animalId),
    enabled: Number.isFinite(animalId),
  });
}

/**
 * `PATCH /api/animais/{id}/observacao-responsavel`. On success, seeds the
 * observation query with the server's own echoed-back value (the
 * authoritative post-trim/post-clear result) rather than the raw text the
 * user typed — avoids a stale cache entry if the backend normalized
 * (trimmed/blanked) the value differently than what was sent.
 */
export function useUpdateAnimalObservation(animalId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (observacao: string | null) => updateAnimalObservation(animalId, observacao),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.patients.observacao(animalId), result);
    },
  });
}

/**
 * Explicit action-style mutation, not an always-live query — a lookup only
 * ever happens when the user submits an ArkIve id, never automatically. No
 * client-side authorization logic here or in `getPatientByArkiveId`: Java
 * alone decides 200 (authorized) / 403 (found but not authorized) / 404 (no
 * such patient) via the exact same `exigirLeituraAnimal` rule every other
 * patient read uses.
 *
 * `retry: false` on top of this QueryClient's own mutation default (already
 * `retry: false` globally) — stated explicitly because a 403/404 here must
 * never be silently retried.
 *
 * On success, seeds `queryKeys.patients.detail(patient.id)` with the
 * returned record — the SAME canonical Animal `usePatient(id)` already
 * reads, never a new/duplicated one (this app never calls `POST
 * /api/animais` from here). Deliberately does NOT touch
 * `useMyPatients`/`useMyAnimals` list caches: list membership stays entirely
 * server-driven, never reproduced or guessed client-side — if this patient
 * legitimately belongs in one of those lists, the next normal refetch of
 * that screen already reflects it.
 */
export function useLookupPatientByArkiveId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (arkivePatientId: string) => getPatientByArkiveId(arkivePatientId),
    retry: false,
    onSuccess: (patient) => {
      queryClient.setQueryData(queryKeys.patients.detail(patient.id), patient);
    },
  });
}
