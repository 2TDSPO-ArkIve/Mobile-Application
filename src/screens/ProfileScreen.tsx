import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ListRow } from '../components/ListRow';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useOwnVeterinario } from '../hooks/useVeterinario';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import type { AppStackParamList } from '../interfaces/navigation';
import { nameInitials } from '../utils/patientDisplay';
import { spacing, fontSize, font, radius, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';

/**
 * Real identity, not the old `useAuth().user` compatibility shim (which
 * just mirrored the Basic Auth login username/email — see AuthContext.tsx's
 * `toLegacyUser`). Backend contract confirmed: `GET /api/veterinarios/me`
 * (`VeterinarioResponse.java`) has no `telefone` field at all, so this
 * screen never shows a phone number — showing one would mean inventing data
 * the backend doesn't have.
 */
export function ProfileScreen() {
  const { logout } = useAuth();
  const { data: veterinario, isPending, isError, refetch } = useOwnVeterinario();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const sectionTitle = (title: string) => (
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('profile.title')} />

      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        {isPending ? (
          <LoadingState message={t('profile.loading')} />
        ) : isError || !veterinario ? (
          <EmptyState
            tone="error"
            title={t('profile.loadErrorTitle')}
            message={t('profile.loadErrorGeneric')}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        ) : (
          <AppCard style={styles.identity}>
            <View style={[styles.initials, { backgroundColor: colors.accentTint }]}>
              <Text style={[styles.initialsText, { color: colors.accent }]}>{nameInitials(veterinario.nome)}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: colors.ink }]}>{veterinario.nome}</Text>
              <Text style={[styles.detail, { color: colors.inkSecondary }]}>{t('profile.roleLabel')}</Text>
              <Text style={[styles.detail, styles.facts, { color: colors.inkSecondary }]}>{veterinario.email}</Text>
              <Text style={[styles.detail, { color: colors.inkSecondary }]}>
                {t('profile.crmvLabel', { value: veterinario.crmv })}
              </Text>
              {veterinario.especialidade ? (
                <Text style={[styles.detail, { color: colors.inkSecondary }]}>{veterinario.especialidade}</Text>
              ) : null}
              {veterinario.clinicaNome ? (
                <Text style={[styles.detail, { color: colors.inkSecondary }]}>{veterinario.clinicaNome}</Text>
              ) : null}
            </View>
          </AppCard>
        )}

        {/* Chunk 6 — the one discoverable entry point to the veterinarian's
            own financial dashboard. Deliberately not duplicated on the Home
            tab (avoids overcrowding it with an unrelated card) and
            deliberately absent from ResponsavelAppStack entirely — a
            Responsible user has no Mobile navigation path to this screen. */}
        {sectionTitle(t('profile.financialSection'))}
        <AppCard style={styles.group}>
          <ListRow
            icon="cash-outline"
            title={t('vetCosts.entryPointButton')}
            onPress={() => navigation.navigate('ValoresVeterinario')}
          />
        </AppCard>

        {/* Chunk 7 — read-only tracking of the vet's own outgoing access
            requests. The actual "request access" action lives on
            ArkiveIdLookupScreen (only surfaced once a lookup is forbidden,
            since that's the exact moment the feature is relevant); this is
            just the follow-up visibility into requests already sent. */}
        {sectionTitle(t('profile.accessSection'))}
        <AppCard style={styles.group}>
          <ListRow
            icon="key-outline"
            title={t('myAccessRequests.entryPointButton')}
            onPress={() => navigation.navigate('SolicitacoesAcessoEnviadas')}
          />
        </AppCard>

        {sectionTitle(t('profile.securitySection'))}
        <AppCard style={styles.group}>
          <ListRow
            icon="lock-closed-outline"
            title={t('profile.changePasswordButton')}
            onPress={() => navigation.navigate('AlterarSenha')}
          />
          <ListRow
            icon="settings-outline"
            title={t('profile.settingsButton')}
            onPress={() => navigation.navigate('Configuracoes')}
          />
        </AppCard>

        {/* Chunk 8 — moved out of Segurança (sharing an animal's access isn't
            an account-security action). */}
        {sectionTitle(t('profile.sharingSection'))}
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
          title={t('profile.logoutButton')}
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
