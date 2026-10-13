import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPrescricao,
  deletePrescricao,
  getPrescricao,
  listPrescricoesByConsulta,
  updatePrescricao,
  type PrescricaoDto,
  type PrescricaoRequestInput,
} from '../services/prescricaoService';
import { queryKeys } from '../query/queryKeys';

export function usePrescricoesByConsulta(consultaId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.prescricoes.byConsulta(consultaId),
    queryFn: () => listPrescricoesByConsulta(consultaId),
    enabled: options?.enabled ?? true,
  });
}

/** Seeds from the by-consulta list cache so navigating from the list into a detail never flashes empty. */
export function usePrescricao(id: number, consultaId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.prescricoes.detail(id),
    queryFn: () => getPrescricao(id),
    initialData: () =>
      queryClient
        .getQueryData<PrescricaoDto[]>(queryKeys.prescricoes.byConsulta(consultaId))
        ?.find((item) => item.id === id),
  });
}

/**
 * `consultaId` is a hook parameter, not a form field — the veterinarian
 * never types or edits it. `mutationFn` merges it in, so the caller only
 * ever supplies the fields an actual prescription form has.
 *
 * `animalId` (optional) additionally invalidates that patient's cost
 * dashboard (`GET /api/animais/{id}/custos`) AND history timeline
 * (`GET /api/animais/{id}/historico`) — prescriptions only ever belong to an
 * already-`FI` consultation (`exigirConsultaFinalizada`), so a
 * new/changed/deleted `valorMedicamento` (and the prescription itself) can
 * immediately affect both an already-cached cost query and an already-cached
 * history query, unlike editing an AG consultation's own `valorConsulta`
 * (see `useUpdateConsulta`'s note on why that case doesn't need the cost
 * one). Callers pass it from `consulta.animalId`, which is already fetched
 * at every call site (`NewPrescricaoScreen`/`EditPrescricaoScreen`/
 * `PrescricaoDetailScreen` all load the parent consultation for display) —
 * no extra lookup invented just for this invalidation.
 */
export function useCreatePrescricao(consultaId: number, animalId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<PrescricaoRequestInput, 'consultaId'>) =>
      createPrescricao({ ...input, consultaId }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prescricoes.byConsulta(consultaId) });
      if (animalId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.costs(animalId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.history(animalId) });
      }
    },
  });
}

export function useUpdatePrescricao(id: number, consultaId: number, animalId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<PrescricaoRequestInput, 'consultaId'>) =>
      updatePrescricao(id, { ...input, consultaId }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prescricoes.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.prescricoes.byConsulta(consultaId) });
      if (animalId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.costs(animalId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.history(animalId) });
      }
    },
  });
}

export function useDeletePrescricao(consultaId: number, animalId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePrescricao(id),
    retry: false,
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prescricoes.byConsulta(consultaId) });
      queryClient.removeQueries({ queryKey: queryKeys.prescricoes.detail(id) });
      if (animalId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.costs(animalId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.history(animalId) });
      }
    },
  });
}
