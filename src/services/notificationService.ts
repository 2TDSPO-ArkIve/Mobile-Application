import { apiGet, apiPatch } from './apiClient';

/**
 * Confirmed against `entity/TipoNotificacao.java`/`TipoRecursoNotificacao.java`
 * (Chunk 1) — exactly these values, nothing invented client-side.
 * `CONSULTA_AGENDADA`/`LEMBRETE_CONSULTA`/`SOLICITACAO_ACESSO` are new;
 * `CONSULTA_FINALIZADA` is the only one this app currently generates UI
 * copy/navigation around — the others render using the backend's own
 * title/message like any other notification, but `SOLICITACAO_ACESSO`
 * deliberately has NO navigation action yet (its approval/rejection UI is a
 * later chunk) — see `NotificationsScreen.tsx`'s own note on why that's safe
 * rather than a missing feature.
 */
export type NotificationType = 'CONSULTA_AGENDADA' | 'LEMBRETE_CONSULTA' | 'CONSULTA_FINALIZADA' | 'SOLICITACAO_ACESSO';
export type NotificationResourceType = 'CONSULTA' | 'SOLICITACAO_ACESSO';

/** `NotificacaoResponse.java`, confirmed field-for-field. */
export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  animalId: number | null;
  arkivePatientId: string | null;
  resourceType: NotificationResourceType | null;
  resourceId: number | null;
}

export interface ListNotificationsParams {
  /** Defaults to `false` server-side when omitted (all notifications, read and unread). */
  naoLidas?: boolean;
  page?: number;
  size?: number;
}

/**
 * This app has no infinite-scroll/pagination UI yet — every caller
 * (`NotificationsScreen`, `NotificationBridge`) explicitly requests this
 * first-page size rather than silently depending on Spring's own default
 * page size. The notification center therefore shows the most recent
 * `DEFAULT_NOTIFICATIONS_PAGE_SIZE` notifications, not an exhaustive
 * archive — a real pagination UI is a separate, later enhancement.
 */
export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 50;

function buildListQuery(params?: ListNotificationsParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.naoLidas !== undefined) search.set('naoLidas', String(params.naoLidas));
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.size !== undefined) search.set('size', String(params.size));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** `GET /api/notificacoes` — a Spring Data `Page`, not a bare array — unwrap `.content`, same convention as every other paged list in this app. */
export async function listNotifications(params?: ListNotificationsParams): Promise<NotificationDto[]> {
  const page = await apiGet<{ content: NotificationDto[] }>(`/api/notificacoes${buildListQuery(params)}`);
  return page.content;
}

/** `GET /api/notificacoes/nao-lidas/contagem` — the dedicated, cheap count endpoint backing the header bell's badge (never derived by counting a fetched list client-side). */
export async function getUnreadNotificationCount(): Promise<number> {
  const result = await apiGet<{ count: number }>('/api/notificacoes/nao-lidas/contagem');
  return result.count;
}

/** `PATCH /api/notificacoes/{id}/lida` — returns the updated notification (with `readAt` now set). */
export async function markNotificationRead(id: number): Promise<NotificationDto> {
  return apiPatch<NotificationDto>(`/api/notificacoes/${id}/lida`);
}

/** `PATCH /api/notificacoes/lidas` — marks every unread notification as read; returns how many were updated. */
export async function markAllNotificationsRead(): Promise<number> {
  const result = await apiPatch<{ updated: number }>('/api/notificacoes/lidas');
  return result.updated;
}
