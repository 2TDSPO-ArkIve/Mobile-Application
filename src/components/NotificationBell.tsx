import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBadge } from './NotificationBadge';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { useTranslation } from '../i18n/useTranslation';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

interface Props {
  onPress: () => void;
}

/**
 * Standalone reusable bell — for headers that build their own markup
 * (`HomeHeader`) rather than going through `AppHeader`'s `actions` prop
 * (which gets the same badge capability via `HeaderIconButton` directly —
 * see `MeusAnimaisScreen`). Self-contained: owns its own unread-count read,
 * the caller only supplies where to navigate.
 *
 * If the unread-count query fails, this renders the bell without a badge
 * rather than hiding the bell or erroring the whole header — a stale/missing
 * count is not a reason to lose notification access entirely.
 */
export function NotificationBell({ onPress }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { data: count } = useUnreadNotificationCount();
  const unread = count ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={(state: InteractionState) => [
        styles.btn,
        { borderColor: colors.line },
        isActive(state) && { backgroundColor: colors.sunken },
        focusRing(state, colors),
      ]}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('notifications.bellLabelUnread', { count: unread }) : t('notifications.bellLabel')}
    >
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={22} color={colors.ink} />
      <NotificationBadge count={unread} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
});
