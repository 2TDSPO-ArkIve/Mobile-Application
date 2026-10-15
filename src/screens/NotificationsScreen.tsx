import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';
import { DEFAULT_NOTIFICATIONS_PAGE_SIZE, type NotificationDto } from '../services/notificationService';
import { describeNotificationsError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { spacing, fontSize, radius } from '../styles/theme';

/**
 * Reused across BOTH `AppStack` (VETERINARIO) and `ResponsavelAppStack`
 * (RESPONSAVEL) — minimal inline nav type, same pattern as every other
 * screen shared this way. Only the routes actually navigated to from here
 * are listed; which ones are reachable depends on which stack is hosting
 * this screen at runtime (see `handlePress`'s role branch below).
 *
 * Polling-based, not real-time push: this screen (and the header bell) are
 * the one authoritative "notification center" for the browser-first
 * product. Chunk 1 synchronized the full backend notification type set
 * (`CONSULTA_AGENDADA`/`LEMBRETE_CONSULTA`/`CONSULTA_FINALIZADA`/
 * `SOLICITACAO_ACESSO`) — every type renders using the backend's own
 * title/message like any other notification, but only `CONSULTA`-resource
 * types navigate anywhere; `SOLICITACAO_ACESSO` deliberately navigates
 * nowhere yet (its approval/rejection UI is a later chunk — see
 * `handlePress`'s own note on why that's safe rather than a missing feature).
 */
type NotificationsNavigationParamList = {
  ConsultaDetalhe: { consultaId: number };
  HistoricoPaciente: { patientId: number };
};

function NotificationItem({
  notification,
  onPress,
}: {
  notification: NotificationDto;
  onPress: (notification: NotificationDto) => void;
}) {
  const colors = useThemeColors();
  const isUnread = notification.readAt === null;
  const date = new Date(notification.createdAt);
  const hasValidDate = !Number.isNaN(date.getTime());

  return (
    <AppCard
      onPress={() => onPress(notification)}
      style={isUnread ? { backgroundColor: colors.primaryTint, borderColor: colors.primaryLight } : undefined}
    >
      <View style={styles.headerRow}>
        <Text
          style={[styles.title, { color: colors.text, fontWeight: isUnread ? '800' : '600' }]}
          numberOfLines={2}
        >
          {notification.title}
        </Text>
        {isUnread ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
        {notification.message}
      </Text>
      {hasValidDate ? (
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDateTime(date)}</Text>
      ) : null}
    </AppCard>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NotificationsNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isVeterinario } = useAuth();

  // No infinite-scroll/pagination UI exists yet — this explicitly requests a
  // bounded first page rather than silently relying on Spring's own default
  // page size. The center therefore shows the most recent
  // DEFAULT_NOTIFICATIONS_PAGE_SIZE notifications, not an exhaustive archive.
  const { data, isPending, isError, error, refetch } = useNotifications({
    page: 0,
    size: DEFAULT_NOTIFICATIONS_PAGE_SIZE,
  });
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [actionError, setActionError] = useState('');

  const handlePress = async (notification: NotificationDto) => {
    setActionError('');
    if (notification.readAt === null) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        setActionError(t('notifications.markReadError'));
        return;
      }
    }

    // `SOLICITACAO_ACESSO` is excluded from navigation entirely, for BOTH
    // roles, checked BEFORE any role branch below: Chunk 1 confirmed
    // (`NotificacaoService.criarParaSolicitacaoAcesso`) that this
    // notification type ALSO populates `animalId` (it's created with the
    // target animal attached), so the RESPONSAVEL branch below would
    // otherwise incorrectly route an access-request notification straight
    // into that patient's clinical history — a resource that exists, but is
    // the wrong destination for "approve/reject this access request". There
    // is no access-request UI yet (a later chunk), so this type is marked
    // read (already done above) and simply never navigates anywhere.
    if (notification.type === 'SOLICITACAO_ACESSO') {
      return;
    }

    // Role-safe navigation: a VETERINARIO's own consultation detail route
    // doesn't exist in ResponsavelAppStack, and a RESPONSAVEL has no
    // authorized path to it — never attempt it there. For RESPONSAVEL,
    // HistoricoPaciente (not PacienteDetalhe) is preferred: a finalized-
    // consultation notification naturally points at the patient's updated
    // clinical history, not just its static profile. This also covers the
    // new `CONSULTA_AGENDADA`/`LEMBRETE_CONSULTA` types identically — both
    // are schedule-related events on the same consultation resource.
    if (isVeterinario) {
      if (notification.resourceType === 'CONSULTA' && notification.resourceId != null) {
        navigation.navigate('ConsultaDetalhe', { consultaId: notification.resourceId });
      }
      return;
    }

    if (notification.animalId != null) {
      navigation.navigate('HistoricoPaciente', { patientId: notification.animalId });
    }
    // Missing resource ids: already marked read above, simply don't navigate.
  };

  const handleMarkAllRead = async () => {
    setActionError('');
    try {
      await markAllRead.mutateAsync();
    } catch {
      setActionError(t('notifications.markAllReadError'));
    }
  };

  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('notifications.title')} />
      <ScreenContainer>
        {hasUnread ? (
          <AppButton
            title={t('notifications.markAllRead')}
            variant="ghost"
            size="small"
            onPress={handleMarkAllRead}
            loading={markAllRead.isPending}
            disabled={markAllRead.isPending}
            style={styles.markAllButton}
          />
        ) : null}

        {actionError ? <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{actionError}</Text> : null}

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
            {t('notifications.loading')}
          </Text>
        ) : isError ? (
          <>
            <EmptyState title={t('notifications.loadErrorTitle')} message={describeNotificationsError(error)} />
            <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
          </>
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('notifications.emptyTitle')} message={t('notifications.emptyMessage')} />
        ) : (
          data.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onPress={handlePress} />
          ))
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  markAllButton: { alignSelf: 'flex-end', marginBottom: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: fontSize.md, flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: radius.full, marginTop: 6 },
  message: { fontSize: fontSize.sm, marginTop: spacing.xs },
  dateText: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
