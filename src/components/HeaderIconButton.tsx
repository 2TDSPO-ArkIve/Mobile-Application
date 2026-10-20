import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { NotificationBadge } from './NotificationBadge';

const ICON_SIZE = 22;
const TOUCH_TARGET = 44;

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
  /** Optional unread-count overlay (e.g. the notifications action) — omitted entirely for every other existing action, which keeps rendering exactly as before. */
  badgeCount?: number;
}

/**
 * The one minimalist auxiliary/navigation action control in the app —
 * transparent background, icon only, no circle, no shadow, `ink` color. Used both by `AppHeader`'s `actions` prop and directly by the
 * handful of tab-root screens (Consultas/Pacientes) whose title row sits
 * below `HomeHeader` rather than inside `AppHeader` itself, so every "+"/
 * refresh/settings affordance in the app renders identically regardless of
 * which header owns it.
 *
 * A visually small icon (22px) still gets a full 44px touch target — the
 * padding is invisible, not a drawn circle.
 */
export function HeaderIconButton({ icon, onPress, accessibilityLabel, disabled, loading, badgeCount }: Props) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && !disabled ? { opacity: 0.6 } : null]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.ink} />
      ) : (
        <Ionicons name={icon} size={ICON_SIZE} color={disabled ? colors.inkSecondary : colors.ink} />
      )}
      {badgeCount != null ? <NotificationBadge count={badgeCount} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
