import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HeaderIconButton } from './HeaderIconButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
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
 * `surface` with a thin `line` bottom border. Title and back/action
 * affordances are `ink`; never a solid accent bar behind light text.
 */
export function AppHeader({ title, showBack = true, actions }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
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
          borderBottomColor: colors.line,
        },
      ]}
    >
      {/* Background/border stay full-bleed; only the content column caps at
          the same max-width as ScreenContainer so the title visually lines
          up with the screen body on tablets/web instead of sitting flush
          left in an otherwise-centered layout. */}
      <View style={styles.inner}>
        {showBack ? (
          <View style={styles.iconBtn}>
            <HeaderIconButton
              icon={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                // A web refresh opens a screen with nothing under it (see navigation/linking.ts).
                else navigation.reset({ index: 0, routes: [{ name: navigation.getState().routeNames[0] }] });
              }}
              accessibilityLabel={t('common.back')}
            />
          </View>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
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
    fontSize: fontSize.lg,
    ...font('semibold'),
    textAlign: 'center',
  },
  iconBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: { flexDirection: 'row' },
});
