import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useOwnVeterinario } from '../hooks/useVeterinario';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/**
 * Real identity, not the old `useAuth().user` compatibility shim (which
 * just mirrored the Basic Auth login username/email — see AuthContext.tsx's
 * `toLegacyUser`). Backend contract confirmed: `GET /api/veterinarios/{id}`
 * (`VeterinarioResponse.java`) has no `telefone` field at all, so this
 * screen never shows a phone number — showing one would mean inventing data
 * the backend doesn't have.
 */
export function ProfileScreen() {
  const { logout } = useAuth();
  const { data: veterinario, isPending, isError } = useOwnVeterinario();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('profile.title')} />

      <ScreenContainer>
        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }}>
            {t('profile.loading')}
          </Text>
        ) : isError || !veterinario ? (
          <EmptyState title={t('profile.loadErrorTitle')} message={t('profile.loadErrorGeneric')} />
        ) : (
          <AppCard style={styles.profileCard}>
            <Text style={[styles.name, { color: colors.text }]}>{veterinario.nome}</Text>
            <Text style={[styles.subtitle, { color: colors.primary }]}>{t('profile.roleLabel')}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              {veterinario.email}
            </Text>
            <Text style={{ color: colors.textSecondary }}>{t('profile.crmvLabel', { value: veterinario.crmv })}</Text>
            {veterinario.especialidade ? (
              <Text style={{ color: colors.textSecondary }}>{veterinario.especialidade}</Text>
            ) : null}
            {veterinario.clinicaNome ? (
              <Text style={{ color: colors.textSecondary }}>{veterinario.clinicaNome}</Text>
            ) : null}
          </AppCard>
        )}

        {/*
          There is no confirmed backend self-update endpoint for a
          veterinarian's own profile: PUT /api/veterinarios/{id} exists, but
          it's the general clinic-admin CRUD endpoint (no per-caller
          ownership check, full-replace body including clinicaId/ativo) —
          not a purpose-built "edit my own profile" contract. Wiring this
          button to it would either risk a vet accidentally overwriting
          clinic-managed fields, or misrepresent an admin endpoint as
          self-service. Descoped until a real self-update contract exists,
          rather than pretending a local-only save succeeded on the server.
        */}
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }}>
          {t('profile.editUnavailable')}
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('profile.securitySection')}</Text>
        <AppButton
          title={t('profile.changePasswordButton')}
          variant="outline"
          onPress={() => navigation.navigate('AlterarSenha')}
        />

        <AppButton
          title={t('profile.settingsButton')}
          variant="outline"
          onPress={() => navigation.navigate('Configuracoes')}
        />

        <AppButton title={t('profile.logoutButton')} variant="danger" onPress={logout} />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard: {
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
