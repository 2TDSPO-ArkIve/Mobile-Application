import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationDto,
  type ListNotificationsParams,
} from '../services/notificationService';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from './useAuth';

/**
 * 30s — modest enough to not hammer the backend, frequent enough that a
 * newly-finalized consultation's notification shows up without a manual
 * refresh. There is no WebSocket/SSE channel in this app; polling is the
 * entire "real-time" mechanism, both for the header badge and for
 * `NotificationBridge`'s own local-notification discovery (see that file).
 */
const UNREAD_COUNT_POLL_MS = 30_000;

/**
 * `enabled` is gated to `status === 'authenticated'` for every hook in this
 * file — notifications are never fetched for an unauthenticated/initializing
 * session. Logout already clears the entire TanStack Query cache
 * (`AuthContext.applySignedOut` calls `queryClient.clear()`), so no
 * additional per-query cleanup is needed here to avoid leaking one account's
 * notifications into the next session.
 */
export function useNotifications(params?: ListNotificationsParams, options?: { refetchInterval?: number }) {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => listNotifications(params),
    enabled: status === 'authenticated',
    ...(options?.refetchInterval !== undefined ? { refetchInterval: options.refetchInterval } : {}),
  });
}

/** The header bell's badge count — the one continuously-polled notification query (see `UNREAD_COUNT_POLL_MS`). */
export function useUnreadNotificationCount() {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadNotificationCount,
    enabled: status === 'authenticated',
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

/**
 * Updates the unread-count cache DIRECTLY (decrement, floored at 0) so the
 * header badge reflects the change immediately, without waiting for the next
 * 30s poll tick. Also patches any already-cached notification LIST entries in
 * place via `setQueriesData` scoped to `queryKeys.notifications.lists()` —
 * deliberately NOT `.all`, which also matches the unread-count cache (a plain
 * `number`); running this array-mapping updater against that entry would
 * call `.map` on a number and throw. The final `invalidateQueries` IS scoped
 * to `.all` on purpose — invalidation doesn't run an updater function, it
 * just marks queries stale, so it's safe (and desired) to refetch both the
 * lists and the count there.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<number>(queryKeys.notifications.unreadCount(), (current) =>
        current != null ? Math.max(0, current - 1) : current
      );
      queryClient.setQueriesData<NotificationDto[]>({ queryKey: queryKeys.notifications.lists() }, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Same immediate-badge-update principle as `useMarkNotificationRead`, but the
 * count is known exactly (zero) rather than decremented. Also patches every
 * currently-cached notification LIST in place (scoped to `.lists()` — see
 * that hook's own note on why `.all` is unsafe for an array-mapping updater)
 * — any item with `readAt === null` gets a local ISO timestamp so its unread
 * emphasis drops immediately, without waiting for the follow-up invalidation/
 * refetch. The backend's `PATCH /api/notificacoes/lidas` response only
 * returns `{ updated: count }`, not individual per-row timestamps, so this
 * local value is explicitly temporary presentation state — only `readAt` is
 * touched, every other field is left exactly as returned by the server; the
 * subsequent invalidation replaces it with the authoritative backend
 * `readAt` on refetch. All of this only runs inside `onSuccess`, so a failed
 * PATCH never mutates any cache.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
      queryClient.setQueriesData<NotificationDto[]>({ queryKey: queryKeys.notifications.lists() }, (current) =>
        current?.map((item) => (item.readAt === null ? { ...item, readAt } : item))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
