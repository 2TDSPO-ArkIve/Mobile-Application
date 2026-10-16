import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAccessRequest,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  type ListAccessRequestsParams,
} from '../services/patientAccessRequestService';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from './useAuth';

/**
 * The authenticated VETERINARIO's own outgoing requests. Java never notifies
 * the requesting vet of an approval/rejection outcome (confirmed absent in
 * the current backend source — the only notification this feature creates
 * goes to the deciding Responsible) — `refetchInterval` is this screen's own
 * compensating mechanism so a pending request's resolution is still
 * discovered within a reasonable time, same 30s cadence as the existing
 * notification/unread-count polling elsewhere in this app.
 */
export function useMyAccessRequests(params?: ListAccessRequestsParams, options?: { refetchInterval?: number }) {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.accessRequests.mine(params),
    queryFn: () => listAccessRequests(params),
    enabled: status === 'authenticated',
    ...(options?.refetchInterval !== undefined ? { refetchInterval: options.refetchInterval } : {}),
  });
}

/** The authenticated RESPONSAVEL's incoming requests — only ones they currently hold an active/vigente `AnimalResponsavel` link for (Java-side scoping, confirmed). */
export function useReceivedAccessRequests(params?: ListAccessRequestsParams) {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.accessRequests.received(params),
    queryFn: () => listAccessRequests(params),
    enabled: status === 'authenticated',
  });
}

/** `POST /api/solicitacoes-acesso`. `retry: false` — a state-changing POST must never be silently repeated, same invariant as every other mutation in this app. */
export function useCreateAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (arkivePatientId: string) => createAccessRequest({ arkivePatientId }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accessRequests.mine() });
    },
  });
}

/**
 * `POST /api/solicitacoes-acesso/{id}/aprovar`. On success, invalidates the
 * Responsible's own received list (the approved row's status/resolvedAt
 * changed) AND `patients.all` — approval grants real, server-side patient
 * access for the requesting veterinarian, so their own authorized patient
 * lists/queries may now legitimately include this animal. This app never
 * manually inserts the patient into any cached list itself; the next
 * server-authorized refetch is what determines real membership.
 */
export function useApproveAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => approveAccessRequest(id),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accessRequests.received() });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

/** `POST /api/solicitacoes-acesso/{id}/rejeitar`. Grants nothing — only the Responsible's own received list needs invalidating. */
export function useRejectAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rejectAccessRequest(id),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accessRequests.received() });
    },
  });
}
