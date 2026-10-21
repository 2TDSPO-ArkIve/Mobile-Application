import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';
import { DEFAULT_NOTIFICATIONS_PAGE_SIZE, type NotificationDto, type NotificationType } from '../services/notificationService';
import { resolveNotificationDestination } from '../utils/notificationNavigation';
import { describeNotificationsError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { spacing, fontSize, radius, font, iconSize, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';

/**
 * Chunk 5 — purely visual categorization, never a text substitute: the
 * backend's own `title`/`message` remain the only displayed copy for every
 * type (see this file's own long-standing note below on why a specific
 * backend message is never replaced with a generic invented one). Icon
 * choice alone is never the only signal distinguishing a type from another —
 * the backend text next to it always disambiguates for a screen-reader/
 * color-blind user too.
 */
const NOTIFICATION_TYPE_ICON: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  CONSULTA_AGENDADA: 'calendar-outline',
  LEMBRETE_CONSULTA: 'alarm-outline',
  CONSULTA_FINALIZADA: 'checkmark-done-outline',
  SOLICITACAO_ACESSO: 'key-outline',
};

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
 * title/message like any other notification. Chunk 7: `SOLICITACAO_ACESSO`
 * now navigates to the Responsible's own access-requests screen (see
 * `resolveNotificationDestination`'s own note on why this is RESPONSAVEL-only
 * and keyed by `resourceType`/`resourceId`, never `animalId`).
 */
type NotificationsNavigationParamList = {
  ConsultaDetalhe: { consultaId: number };
  HistoricoPaciente: { patientId: number };
  SolicitacoesAcessoRecebidas: { focusRequestId: number };
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
      style={isUnread ? { backgroundColor: colors.accentTint } : undefined}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name={NOTIFICATION_TYPE_ICON[notification.type]}
            size={iconSize.sm}
            color={colors.inkSecondary}
            style={styles.typeIcon}
          />
          <Text
            style={[styles.title, { color: colors.ink }, font(isUnread ? 'semibold' : 'regular')]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
        </View>
        {isUnread ? <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} /> : null}
      </View>
      <Text style={[styles.message, { color: colors.inkSecondary }]} numberOfLines={3}>
        {notification.message}
      </Text>
      {hasValidDate ? (
        <Text style={[styles.dateText, { color: colors.inkSecondary }]}>{formatDateTime(date)}</Text>
      ) : null}
    </AppCard>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NotificationsNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isVeterinario } = useAuth();
  const wide = useBreakpoint() === 'wide';

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
    // Fire and forget: a failed PATCH only leaves the item unread, which the
    // list shows on return; it must not keep the person from the content.
    if (notification.readAt === null) markRead.mutate(notification.id);

    // Shared with the native push/local-notification tap handler
    // (`PushTapHandler`) — see `resolveNotificationDestination`'s own doc
    // comment for the full role-safety rationale (SOLICITACAO_ACESSO never
    // navigates, VETERINARIO only to ConsultaDetalhe, RESPONSAVEL only to
    // HistoricoPaciente via animalId).
    const destination = resolveNotificationDestination(notification, isVeterinario);
    if (destination?.screen === 'ConsultaDetalhe') {
      navigation.navigate('ConsultaDetalhe', destination.params);
    } else if (destination?.screen === 'HistoricoPaciente') {
      navigation.navigate('HistoricoPaciente', destination.params);
    } else if (destination?.screen === 'SolicitacoesAcessoRecebidas') {
      navigation.navigate('SolicitacoesAcessoRecebidas', destination.params);
    }
    // No destination (missing resource ids, or a VETERINARIO session seeing
    // a SOLICITACAO_ACESSO notification it was never meant to receive):
    // already marked read above, simply don't navigate.
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
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined} onRefresh={refetch}>
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
          <LoadingState message={t('notifications.loading')} />
        ) : isError ? (
          <>
            <EmptyState
              tone="error"
              title={t('notifications.loadErrorTitle')}
              message={describeNotificationsError(error)}
              actionLabel={t('common.tryAgain')}
              onAction={() => refetch()}
            />
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', flexShrink: 1, gap: spacing.xs },
  typeIcon: { marginTop: 3 },
  title: { fontSize: fontSize.md, lineHeight: 22, flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: radius.full, marginTop: 7 },
  message: { fontSize: fontSize.sm, marginTop: spacing.xs },
  dateText: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
