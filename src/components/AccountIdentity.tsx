import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useThemeColors } from '../hooks/useThemeColors';
import { nameInitials } from '../utils/patientDisplay';
import { spacing, fontSize, font, radius } from '../styles/theme';

interface Props {
  name: string;
  role: string;
  /** Login or e-mail first, then any extra facts (CRMV, clinic); empty entries are skipped. */
  details: (string | null | undefined)[];
}

/** Identity card at the top of Perfil (VETERINARIO) and Minha conta (RESPONSAVEL). */
export function AccountIdentityCard({ name, role, details }: Props) {
  const colors = useThemeColors();
  const lines = details.filter(Boolean) as string[];

  return (
    <AppCard style={styles.identity}>
      <View style={[styles.initials, { backgroundColor: colors.accentTint }]}>
        <Text style={[styles.initialsText, { color: colors.accent }]}>{nameInitials(name)}</Text>
      </View>
      <View style={styles.identityText}>
        <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
        <Text style={[styles.detail, { color: colors.inkSecondary }]}>{role}</Text>
        {lines.map((line, index) => (
          <Text key={line} style={[styles.detail, index === 0 && styles.facts, { color: colors.inkSecondary }]}>
            {line}
          </Text>
        ))}
      </View>
    </AppCard>
  );
}

/** Section title between the account screens' grouped rows. */
export function AccountSectionTitle({ title }: { title: string }) {
  const colors = useThemeColors();
  return (
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>
      {title}
    </Text>
  );
}

export const accountStyles = StyleSheet.create({
  /** A card of `ListRow`s, edge to edge. */
  group: { padding: 0, overflow: 'hidden' },
  /** Sign-out, set apart from the groups so it is never tapped by mistake. */
  logout: { marginTop: spacing.xl },
});

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  initials: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: fontSize.lg, ...font('semibold') },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.lg, ...font('bold') },
  detail: { fontSize: fontSize.sm, marginTop: 2 },
  facts: { marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, ...font('semibold'), marginTop: spacing.lg, marginBottom: spacing.sm },
});
