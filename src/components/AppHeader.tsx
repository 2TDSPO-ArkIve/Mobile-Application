import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HeaderIconButton } from './HeaderIconButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, fontSize, font } from '../styles/theme';
import type { AppStackParamList } from '../interfaces/navigation';

export interface HeaderAction {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
  /** Optional unread-count overlay — see `HeaderIconButton`. */
  badgeCount?: number;
}

interface Props {
  title: string;
  showBack?: boolean;
  /** Minimal icon-only actions (transparent background, no circle/shadow) — see `HeaderIconButton`. Rendered left-to-right in the order given. */
  actions?: HeaderAction[];
}

/**
 * White surface with a thin bottom border — the ArkIve default. Title is
 * dark on white; back/action affordances are primary blue on white, never
 * the reverse (no solid brand-colored bar behind white text).
 */
export function AppHeader({ title, showBack = true, actions }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Background/border stay full-bleed; only the content column caps at
          the same max-width as ScreenContainer so the title visually lines
          up with the screen body on tablets/web instead of sitting flush
          left in an otherwise-centered layout. */}
      <View style={styles.inner}>
        {showBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={[styles.iconText, { color: colors.primary }]}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {actions && actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {actions.map((action, index) => (
              <HeaderIconButton
                key={index}
                icon={action.icon}
                onPress={action.onPress}
                accessibilityLabel={action.accessibilityLabel}
                disabled={action.disabled}
                loading={action.loading}
                badgeCount={action.badgeCount}
              />
            ))}
          </View>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    ...font('bold'),
    textAlign: 'center',
  },
  iconBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 24, ...font('semibold') },
  actionsRow: { flexDirection: 'row' },
});
