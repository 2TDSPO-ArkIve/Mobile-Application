import type { NotificationDto } from '../services/notificationService';

export type NotificationDestination =
  | { screen: 'ConsultaDetalhe'; params: { consultaId: number } }
  | { screen: 'HistoricoPaciente'; params: { patientId: number } };

/**
 * The single, shared role-safe navigation decision for a notification —
 * extracted from `NotificationsScreen.handlePress` (Chunk 1) so the native
 * push/local-notification tap handler (`PushTapHandler`, Chunk 5) can reuse
 * the EXACT same logic rather than a second, potentially-diverging copy.
 *
 * `SOLICITACAO_ACESSO` never navigates (its own notifications also populate
 * `animalId`, which would otherwise route a RESPONSAVEL straight into that
 * patient's history — the wrong destination for "approve/reject this access
 * request"; that UI is a later chunk). VETERINARIO only ever navigates to
 * `ConsultaDetalhe`, and only for a `CONSULTA`-resource notification with a
 * real `resourceId` — that route doesn't exist in `ResponsavelAppStack`, so
 * it must never be attempted there. RESPONSAVEL navigates to
 * `HistoricoPaciente` using `animalId` when present — never `ConsultaDetalhe`,
 * which is VETERINARIO-only. A notification never grants access by itself:
 * Java still re-authorizes whichever destination screen loads.
 */
export function resolveNotificationDestination(
  notification: Pick<NotificationDto, 'type' | 'resourceType' | 'resourceId' | 'animalId'>,
  isVeterinario: boolean
): NotificationDestination | null {
  if (notification.type === 'SOLICITACAO_ACESSO') {
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
