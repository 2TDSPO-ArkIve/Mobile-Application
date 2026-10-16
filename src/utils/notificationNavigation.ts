import type { NotificationDto } from '../services/notificationService';

export type NotificationDestination =
  | { screen: 'ConsultaDetalhe'; params: { consultaId: number } }
  | { screen: 'HistoricoPaciente'; params: { patientId: number } }
  | { screen: 'SolicitacoesAcessoRecebidas'; params: { focusRequestId: number } };

/**
 * The single, shared role-safe navigation decision for a notification —
 * extracted from `NotificationsScreen.handlePress` (Chunk 1) so the native
 * push/local-notification tap handler (`PushTapHandler`, Chunk 5) can reuse
 * the EXACT same logic rather than a second, potentially-diverging copy.
 *
 * Chunk 7 — `SOLICITACAO_ACESSO` is now handled FIRST, before the role-split
 * below, and by `resourceType`/`resourceId` ONLY — never by `animalId`
 * (confirmed: Java's `SOLICITACAO_ACESSO` notifications also populate
 * `animalId`, which would otherwise incorrectly route into that patient's
 * history, the wrong destination for "approve/reject this request"). Only
 * RESPONSAVEL ever receives this type: confirmed in the current Java source
 * that `criarParaSolicitacaoAcesso`'s recipients are always the animal's
 * eligible Responsible users — the requesting veterinarian is never
 * notified of their own outgoing request, nor of its later approval/
 * rejection. A VETERINARIO session seeing this type anyway (e.g. a stale/
 * misrouted notification) gets no destination — never route a vet into the
 * Responsible-only approval screen.
 *
 * VETERINARIO otherwise only ever navigates to `ConsultaDetalhe`, and only
 * for a `CONSULTA`-resource notification with a real `resourceId` — that
 * route doesn't exist in `ResponsavelAppStack`, so it must never be
 * attempted there. RESPONSAVEL otherwise navigates to `HistoricoPaciente`
 * using `animalId` when present — never `ConsultaDetalhe`, which is
 * VETERINARIO-only. A notification never grants access by itself: Java
 * still re-authorizes whichever destination screen loads.
 */
export function resolveNotificationDestination(
  notification: Pick<NotificationDto, 'type' | 'resourceType' | 'resourceId' | 'animalId'>,
  isVeterinario: boolean
): NotificationDestination | null {
  if (notification.type === 'SOLICITACAO_ACESSO') {
    if (isVeterinario) return null;
    if (notification.resourceType === 'SOLICITACAO_ACESSO' && notification.resourceId != null) {
      return { screen: 'SolicitacoesAcessoRecebidas', params: { focusRequestId: notification.resourceId } };
    }
    return null;
  }

  if (isVeterinario) {
    if (notification.resourceType === 'CONSULTA' && notification.resourceId != null) {
      return { screen: 'ConsultaDetalhe', params: { consultaId: notification.resourceId } };
    }
    return null;
  }

  if (notification.animalId != null) {
    return { screen: 'HistoricoPaciente', params: { patientId: notification.animalId } };
  }

  return null;
}
