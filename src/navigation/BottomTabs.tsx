import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabParamList } from '../interfaces/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { ConsultasScreen } from '../screens/ConsultasScreen';
import { PatientsScreen } from '../screens/PatientsScreen';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { fontSize, spacing } from '../styles/theme';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const ICON_SIZE = 24;
// Generous, explicit content zone (icon + gap + label), fully independent
// of `@react-navigation/bottom-tabs`'s own internal item padding/line-height
// assumptions — see the custom `tabBar` note below for why this replaced
// relying on the library's default bar entirely.
const CONTENT_HEIGHT = 64;

const ICONS: Record<
  keyof BottomTabParamList,
  { active: React.ComponentProps<typeof Ionicons>['name']; inactive: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Consultas: { active: 'calendar', inactive: 'calendar-outline' },
  Pacientes: { active: 'paw', inactive: 'paw-outline' },
};

/**
 * A fully custom tab bar, replacing reliance on
 * `@react-navigation/bottom-tabs`'s own default `BottomTabBar`.
 *
 * Two rounds of tuning `tabBarStyle.height`/`paddingTop`/`paddingBottom`
 * still left the labels clipped on web responsive emulation. Reverse
 * engineering the library's source showed why that was hard to pin down
 * from the outside: the default bar's icon/label spacing comes from
 * several internal pieces (`TabBarIcon`'s own sizing, `labelBeneath`'s
 * `fontSize: 10` with no explicit `lineHeight`, the item's own internal
 * padding) that don't fully surface through the public style props, so a
 * `tabBarStyle.height` override was fighting an internal layout we don't
 * fully control. Rendering the bar ourselves removes that ambiguity
 * entirely: every pixel of icon size, gap, label line-height, and safe-area
 * padding is explicit here, so there is nothing left to clip.
 */
function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          // `height` is a fixed box that padding eats into (RN has no
          // content-box mode), so the inset must be added to the height
          // itself, not just the padding, or the icon+label zone shrinks by
          // exactly the inset on real devices instead of staying constant.
          height: CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + spacing.xs,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.textSecondary;
        const label =
          typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
        const icon = ICONS[route.name as keyof BottomTabParamList];

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            style={styles.item}
          >
            <Ionicons name={focused ? icon.active : icon.inactive} size={ICON_SIZE} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The old "Agenda"/"Animais" tabs (Node-backend Appointment/Animal screens)
 * and their screen files have been removed entirely — that backend no
 * longer exists. "Consultas" and "Pacientes" are the real, Spring-backed
 * replacements.
 */
export function BottomTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Consultas" component={ConsultasScreen} options={{ tabBarLabel: t('nav.consultas') }} />
      <Tab.Screen name="Pacientes" component={PatientsScreen} options={{ tabBarLabel: t('nav.pacientes') }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    lineHeight: fontSize.xs + 6,
  },
});
