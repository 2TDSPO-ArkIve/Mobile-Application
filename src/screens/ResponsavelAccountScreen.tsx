import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ListRow } from '../components/ListRow';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { nameInitials } from '../utils/patientDisplay';
import { spacing, fontSize, font, radius, layout } from '../styles/theme';

/**
 * The RESPONSAVEL counterpart to `ProfileScreen` — deliberately not a shared
 * component: `ProfileScreen` fetches the veterinarian's own profile via
 * `GET /api/veterinarios/me` (role-restricted to VETERINARIO in
 * `SecurityConfig`), which would 403 here. There is no equivalent "fetch my
 * own responsavel profile" endpoint established yet, so this screen
 * deliberately shows only what's already in `AuthContext.identity` (name,
 * login/e-mail) from the last `GET /api/auth/me`, rather than inventing a new
 * backend call. Minimal by design — this phase intentionally doesn't build a
 * responsible-person profile editor.
 */
export function ResponsavelAccountScreen() {
  const { identity, logout } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const navigation =
    useNavigation<NativeStackNavigationProp<ResponsavelAppStackParamList>>();

  const sectionTitle = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('account.title')} />

      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <AppCard style={styles.identity}>
          <View style={[styles.initials, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.initialsText, { color: colors.accent }]}>{nameInitials(identity?.nome ?? '')}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: colors.ink }]}>{identity?.nome}</Text>
            <Text style={[styles.detail, { color: colors.inkSecondary }]}>{t('account.roleLabel')}</Text>
            <Text style={[styles.detail, styles.facts, { color: colors.inkSecondary }]}>{identity?.login}</Text>
          </View>
        </AppCard>

        {sectionTitle(t('account.securitySection'))}
        <AppCard style={styles.group}>
          <ListRow
            icon="lock-closed-outline"
            title={t('account.changePasswordButton')}
            onPress={() => navigation.navigate('AlterarSenha')}
          />
          <ListRow
            icon="settings-outline"
            title={t('account.settingsButton')}
            onPress={() => navigation.navigate('Configuracoes')}
          />
        </AppCard>

        {/* Chunk 8 — moved out of Segurança (sharing an animal's access isn't
            an account-security action). */}
        {sectionTitle(t('account.sharingSection'))}
        <AppCard style={styles.group}>
          <ListRow
            icon="qr-code-outline"
            title={t('scanShareQr.entryLink')}
            onPress={() => navigation.navigate('EscanearConvite')}
          />
          <ListRow
            icon="keypad-outline"
            title={t('enterShareCode.entryLink')}
            onPress={() => navigation.navigate('InserirCodigoConvite')}
          />
        </AppCard>

        {/* Set apart from the groups so it is never tapped by mistake. */}
        <AppButton
          title={t('account.logoutButton')}
          variant="danger"
          icon="log-out-outline"
          onPress={logout}
          style={styles.logout}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  sectionTitle: { fontSize: 16, ...font('semibold'), marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { padding: 0, overflow: 'hidden' },
  logout: { marginTop: spacing.xl },
});
