import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '../services/apiClient';
import {
  createConsulta,
  deleteConsulta,
  finalizeConsulta,
  getClinicalSupport,
  getConsulta,
  listConsultas,
  requestClinicalSupport,
  startConsulta,
  updateConsulta,
  updateNarrativa,
  type ConsultaDto,
  type CreateConsultaInput,
  type FinalizarConsultaRequest,
  type UpdateConsultaInput,
} from '../services/consultaService';
import { queryKeys } from '../query/queryKeys';

/** List — proves screen -> hook -> TanStack Query -> service -> apiClient -> Spring Boot end-to-end. */
export function useConsultas() {
  return useQuery({
    queryKey: queryKeys.consultas.list(),
    queryFn: listConsultas,
  });
}

/**
 * Detail. Seeds from whatever row is already in the list cache — the
 * screen never flashes empty on navigation from the list, and if the
 * unconfirmed by-id GET turns out unsupported, the seeded row still renders
 * (see the confidence note on getConsulta in consultaService.ts).
 */
export function useConsulta(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.consultas.detail(id),
    queryFn: () => getConsulta(id),
    initialData: () =>
      queryClient
        .getQueryData<ConsultaDto[]>(queryKeys.consultas.list())
        ?.find((consulta) => consulta.id === id),
  });
}

export function useCreateConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConsultaInput) => createConsulta(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
    },
  });
}

/**
 * Consumed by EditConsultaScreen (AG-only — see that screen's own note on
 * why). The mutation hydrates every field the form doesn't expose from the
 * already-fetched `ConsultaDto` before sending, since Spring's PUT is a
 * full replace (`ConsultaService.aplicarDados`), never a partial patch.
 */
export function useUpdateConsulta(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateConsultaInput) => updateConsulta(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
    },
  });
}

export function useDeleteConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteConsulta(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
      queryClient.removeQueries({ queryKey: queryKeys.consultas.detail(id) });
    },
  });
}

/** AG -> EP. The resulting status is read back via invalidation + refetch, never assigned locally. */
export function useStartConsulta(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startConsulta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
    },
  });
}

/**
 * Read-only and explicitly confirmed safe (GET never triggers the AI
 * engine). `enabled` defaults to true but callers should gate it to
 * AP/FI consultations — no point polling this for AG/EP/CA.
 *
 * `retry`/`retryDelay` default to the QueryClient's own global defaults
 * (bounded, for the common FI read-only case) but can be overridden by a
 * caller that needs persistent auto-recovery — e.g. ArkiveInsightScreen
 * reopening a just-analyzed consultation into a still-cold engine.
 */
export function useConsultaClinicalSupport(
  id: number,
  options?: {
    enabled?: boolean;
    retry?: UseQueryOptions['retry'];
    retryDelay?: UseQueryOptions['retryDelay'];
  }
) {
  return useQuery({
    queryKey: queryKeys.consultas.clinicalSupport(id),
    queryFn: () => getClinicalSupport(id),
    enabled: options?.enabled ?? true,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
    ...(options?.retryDelay !== undefined ? { retryDelay: options.retryDelay } : {}),
  });
}

/**
 * PATCH narrativa. Only invalidates this consultation's detail — the
 * narrative doesn't appear on the list cards, so refetching the list would
 * be wasted work (see Phase 2.5's "keep invalidation precise" note).
 *
 * Called directly from ConsultaDetailScreen's `handleAnalyze` — awaited to
 * completion before ever navigating to the analysis screen (which is the
 * only place that calls `useRequestClinicalSupport`), preserving the
 * save-then-generate invariant without needing a combined orchestration hook.
 */
export function useSaveNarrativa(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (narrativa: string) => updateNarrativa(id, narrativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
    },
  });
}

/**
 * POST suporte-clinico. `retry: false` is stated explicitly here — on top
 * of the QueryClient's own default — because this is precisely the request
 * that must never be silently repeated (Render/external-engine cold start).
 * On a 409 (another action likely changed this consultation's status),
 * eagerly refetch the detail query so the UI reflects reality instead of
 * inviting a second attempt against stale assumptions.
 */
export function useRequestClinicalSupport(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestClinicalSupport(id),
    retry: false,
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && mutationError.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.clinicalSupport(id) });
    },
  });
}

/**
 * POST finalizar. Used from the dedicated VeterinarianConclusionScreen, not
 * from the intake/analysis flow — finalization has no ordering dependency
 * on the save-then-generate invariant those own; by the time a consultation
 * is AP, the narrative is already saved and AI already ran. `retry: false`
 * for the same reason as the AI mutation: this
 * must never be silently repeated.
 *
 * `onSuccess` SYNCHRONOUSLY seeds the detail (and list) cache with the real
 * finalized response (status FI) before invalidating — a plain invalidate
 * leaves a window where a freshly-mounted ConsultaDetailScreen still reads
 * the stale AP row and redirects to InsightArkive before the refetch
 * resolves (confirmed physical bug: the "bounce back to AP" race). By the
 * time `mutateAsync` resolves, the cache must already say FI.
 */
export function useFinalizeConsulta(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FinalizarConsultaRequest) => finalizeConsulta(id, input),
    retry: false,
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && mutationError.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      }
    },
    onSuccess: (finalized) => {
      queryClient.setQueryData(queryKeys.consultas.detail(id), finalized);
      queryClient.setQueryData<ConsultaDto[]>(queryKeys.consultas.list(), (current) =>
        current?.map((consulta) => (consulta.id === id ? { ...consulta, ...finalized } : consulta))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultas.clinicalSupport(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diagnosticos.byConsulta(id) });
    },
  });
}
