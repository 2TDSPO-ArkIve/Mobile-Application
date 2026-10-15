import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

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
  const navigation =
    useNavigation<NativeStackNavigationProp<ResponsavelAppStackParamList>>();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('account.title')} />

      <ScreenContainer>
        <AppCard style={styles.accountCard}>
          <Text style={[styles.name, { color: colors.text }]}>{identity?.nome}</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>{t('account.roleLabel')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>{identity?.login}</Text>
        </AppCard>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('account.securitySection')}</Text>
        <AppButton
          title={t('account.changePasswordButton')}
          variant="outline"
          onPress={() => navigation.navigate('AlterarSenha')}
        />

        <AppButton
          title={t('account.settingsButton')}
          variant="outline"
          onPress={() => navigation.navigate('Configuracoes')}
        />

        <AppButton
          title={t('scanShareQr.entryLink')}
          variant="ghost"
          size="small"
          onPress={() => navigation.navigate('EscanearConvite')}
        />

        <AppButton title={t('account.logoutButton')} variant="danger" onPress={logout} />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  accountCard: {
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
