import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { ListRow } from '../components/ListRow';
import { AccountIdentityCard, AccountSectionTitle, accountStyles } from '../components/AccountIdentity';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useOwnVeterinario } from '../hooks/useVeterinario';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import type { AppStackParamList } from '../interfaces/navigation';
import { layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';
import { confirmAction } from '../utils/dialog';

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

  // Same confirmation as the mandatory password-change screen's sign-out.
  const handleLogout = () =>
    confirmAction({
      title: t('common.logoutConfirmTitle'),
      message: t('common.logoutConfirmMessage'),
      cancelText: t('common.cancel'),
      confirmText: t('common.logoutConfirmButton'),
      destructive: true,
      onConfirm: () => logout(),
    });

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
          <AccountIdentityCard
            name={veterinario.nome}
            role={t('profile.roleLabel')}
            details={[
              veterinario.email,
              t('profile.crmvLabel', { value: veterinario.crmv }),
              veterinario.especialidade,
              veterinario.clinicaNome,
            ]}
          />
        )}

        {/* The same two sections the wide sidebar lists under the main
            ones, with the same names and icons, so phone and desktop share
            one map. Not on Home (unrelated to the day's cases) and absent
            from ResponsavelAppStack, which has no route to either screen. */}
        <AccountSectionTitle title={t('profile.managementSection')} />
        <AppCard style={accountStyles.group}>
          <ListRow
            icon="bar-chart-outline"
            title={t('vetCosts.title')}
            onPress={() => navigation.navigate('ValoresVeterinario')}
          />
          <ListRow
            icon="sparkles-outline"
            iconColor={colors.ai}
            title={t('aiUsage.title')}
            onPress={() => navigation.navigate('UsoDaIa')}
          />
        </AppCard>

        <AccountSectionTitle title={t('profile.securitySection')} />
        <AppCard style={accountStyles.group}>
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
        <AccountSectionTitle title={t('profile.sharingSection')} />
        <AppCard style={accountStyles.group}>
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
          {/* Chunk 7 — read-only tracking of the vet's own outgoing access
              requests. The actual "request access" action lives on
              ArkiveIdLookupScreen (only surfaced once a lookup is forbidden,
              since that's the exact moment the feature is relevant); this is
              just the follow-up visibility into requests already sent. */}
          <ListRow
            icon="key-outline"
            title={t('myAccessRequests.entryPointButton')}
            onPress={() => navigation.navigate('SolicitacoesAcessoEnviadas')}
          />
        </AppCard>

        {/* Set apart from the groups so it is never tapped by mistake. */}
        <AppButton
          title={t('profile.logoutButton')}
          variant="danger"
          icon="log-out-outline"
          onPress={handleLogout}
          style={accountStyles.logout}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
