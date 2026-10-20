import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { getJson, setJson } from '../storage/base';
import { STORAGE_KEYS } from '../storage/keys';
import { nameInitials } from '../utils/patientDisplay';
import { spacing, radius, fontSize, iconSize, layout, font } from '../styles/theme';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SidebarItem {
  key: string;
  label: string;
  /** Outline at rest, filled when active. */
  icon: { active: IconName; inactive: IconName };
  onPress: () => void;
}

export interface SidebarFooter {
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface Props {
  /** Groups split by a thin divider, no titles (revisão §5.2). */
  groups: SidebarItem[][];
  footer: SidebarFooter;
  activeKey: string | null;
  children: React.ReactNode;
}

/**
 * Navigator `layout` (React Navigation 7): from the wide band up, draws the
 * sidebar beside the stack so it stays on detail screens; below that, only
 * the stack. The tree shape never changes with the width, so resizing does
 * not remount the screens.
 */
export function SidebarLayout({ groups, footer, activeKey, children }: Props) {
  const wide = useBreakpoint() === 'wide';
  const colors = useThemeColors();

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      {wide ? <Sidebar groups={groups} footer={footer} activeKey={activeKey} /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function Sidebar({ groups, footer, activeKey }: Omit<Props, 'children'>) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    getJson(STORAGE_KEYS.sidebarCollapsed, false).then(setCollapsed);
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      setJson(STORAGE_KEYS.sidebarCollapsed, !value);
      return !value;
    });
  };

  const initials = nameInitials(footer.title);

  return (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: colors.surface, width: collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth },
      ]}
      role="navigation"
    >
      <View style={[styles.brandRow, collapsed && styles.centered]}>
        <Image
          source={require('../assets/branding/favicon.png')}
          style={styles.logo}
          resizeMode="contain"
          tintColor={colors.ink}
          accessibilityIgnoresInvertColors
        />
        {collapsed ? null : <Text style={[styles.brand, { color: colors.ink }]}>ArkIve</Text>}
      </View>

      <View style={styles.groups}>
        {groups.map((group, index) => (
          <View key={index} style={[styles.group, index > 0 && { borderTopColor: colors.line, ...styles.divided }]}>
            {group.map((item) => (
              <NavItem key={item.key} item={item} active={item.key === activeKey} collapsed={collapsed} />
            ))}
          </View>
        ))}
      </View>

      <View style={[styles.footerArea, { borderTopColor: colors.line }]}>
        <Pressable
          onPress={footer.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${footer.title}, ${footer.subtitle}`}
          style={(state: InteractionState) => [
            styles.footer,
            collapsed && styles.centered,
            isActive(state) && { backgroundColor: colors.sunken },
            focusRing(state, colors),
          ]}
        >
          <View style={[styles.initials, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.initialsText, { color: colors.accent }]}>{initials}</Text>
          </View>
          {collapsed ? null : (
            <View style={styles.footerText}>
              <Text style={[styles.footerTitle, { color: colors.ink }]} numberOfLines={1}>
                {footer.title}
              </Text>
              <Text style={[styles.footerSubtitle, { color: colors.inkSecondary }]} numberOfLines={1}>
                {footer.subtitle}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          accessibilityState={{ expanded: !collapsed }}
          style={(state: InteractionState) => [
            styles.item,
            collapsed && styles.centered,
            isActive(state) && { backgroundColor: colors.sunken },
            focusRing(state, colors),
          ]}
        >
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-back'}
            size={iconSize.md}
            color={colors.inkSecondary}
          />
          {collapsed ? null : (
            <Text style={[styles.itemText, font('medium'), { color: colors.inkSecondary }]}>
              {t('sidebar.collapse')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function NavItem({ item, active, collapsed }: { item: SidebarItem; active: boolean; collapsed: boolean }) {
  const colors = useThemeColors();
  const color = active ? colors.accent : colors.ink;

  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="link"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={(state: InteractionState) => [
        styles.item,
        collapsed && styles.centered,
        { backgroundColor: active ? colors.accentTint : isActive(state) ? colors.sunken : 'transparent' },
        focusRing(state, colors),
      ]}
    >
      {(state: InteractionState) => (
        <>
          <Ionicons
            name={active ? item.icon.active : item.icon.inactive}
            size={iconSize.md}
            color={active ? colors.accent : colors.inkSecondary}
          />
          {collapsed ? (
            // Rail mode: the label shows as a tooltip on hover and focus.
            state.hovered || state.focused ? (
              <View
                pointerEvents="none"
                style={[styles.tooltip, { backgroundColor: colors.ink }]}
              >
                <Text style={[styles.tooltipText, { color: colors.onInk }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            ) : null
          ) : (
            <Text
              style={[styles.itemText, active ? font('semibold') : font('medium'), { color }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, minWidth: 0 },
  sidebar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 4,
    // Above the stack, so the rail tooltip can overlap the content.
    zIndex: 1,
  },
  centered: { justifyContent: 'center', paddingHorizontal: 0 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  logo: { width: 28, height: 28 },
  brand: { fontSize: fontSize.lg, ...font('bold') },
  groups: { flex: 1 },
  group: { gap: 2, paddingVertical: spacing.sm },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    minHeight: 44,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.md,
  },
  itemText: { flex: 1, fontSize: fontSize.md },
  tooltip: {
    position: 'absolute',
    left: layout.sidebarCollapsedWidth - spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  tooltipText: { fontSize: fontSize.sm, ...font('medium') },
  footerArea: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  initials: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: fontSize.sm, ...font('semibold') },
  footerText: { flex: 1, minWidth: 0 },
  footerTitle: { fontSize: fontSize.sm, ...font('semibold') },
  footerSubtitle: { fontSize: fontSize.xs },
});
