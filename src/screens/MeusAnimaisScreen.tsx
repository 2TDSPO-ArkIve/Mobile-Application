import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchBar } from '../components/SearchBar';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useMyAnimals } from '../hooks/usePatients';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { patientSummaryLine, patientArkiveIdLine } from '../utils/patientDisplay';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The RESPONSAVEL root screen — the entry point to the responsible person's
 * ArkIve shell. Deliberately NOT a reskin of the veterinarian `PatientsScreen`:
 * that screen is wired to `GET /api/animais/me` (VETERINARIO-scoped); this one
 * uses `useMyAnimals` -> `GET /api/animais` (confirmed RESPONSAVEL-scoped
 * server-side — see `listAccessibleAnimals`'s own note). `AppHeader`'s single
 * action opens the account screen rather than reusing `HomeHeader` (which
 * hardcodes a navigate to the veterinarian-only `Perfil` route and would not
 * even type-check against this stack).
 *
 * Chunk 3: "Cadastrar animal" navigates to `CadastrarAnimal`
 * (`NewAnimalScreen`) — Java's `AnimalService.criar` now has a dedicated
 * RESPONSAVEL branch that auto-links the creator as the animal's tutor, so
 * this app's own `useCreatePatient` (already role-neutral) just works here.
 *
 * Chunk 1: search is now the backend's unified `busca` (name OR ArkIve id),
 * debounced locally, rather than filtering only the already-fetched page
 * client-side — see `PatientsScreen`'s own note on the same change; an
 * animal this responsible person cannot access is never returned just
 * because its ArkIve id matches.
 */
export function MeusAnimaisScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ResponsavelAppStackParamList>>();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // MeusAnimais is ResponsavelAppStack's root screen, so it's the reliable
  // single mount point to guide a RESPONSAVEL back to a still-pending share
  // invitation once authenticated — see usePendingShareAutoReturn's own note.
  usePendingShareAutoReturn(navigation);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const trimmedSearch = debouncedSearch.trim();
  const { data, isPending, isError, error } = useMyAnimals({ busca: trimmedSearch || undefined });
  const { data: unreadCount } = useUnreadNotificationCount();

  const hasSearch = trimmedSearch.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('myAnimals.title')}
        showBack={false}
        actions={[
          {
            icon: unreadCount && unreadCount > 0 ? 'notifications' : 'notifications-outline',
            onPress: () => navigation.navigate('Notificacoes'),
            accessibilityLabel:
              unreadCount && unreadCount > 0
                ? t('notifications.bellLabelUnread', { count: unreadCount })
                : t('notifications.bellLabel'),
            badgeCount: unreadCount,
          },
          {
            icon: 'person-circle-outline',
            onPress: () => navigation.navigate('MinhaConta'),
            accessibilityLabel: t('myAnimals.accountAccessibilityLabel'),
          },
        ]}
      />

      <ScreenContainer>
        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder={t('myAnimals.searchPlaceholder')} />

        <AppButton
          title={t('myAnimals.createButton')}
          icon="add"
          onPress={() => navigation.navigate('CadastrarAnimal')}
          style={styles.lookupButton}
        />

        {/* Useful for verifying/opening an already-authorized shared patient — retrieval only, never a path to creating a new animal (that's the button above). */}
        <AppButton
          title={t('myAnimals.lookupByArkiveId')}
          variant="outline"
          onPress={() => navigation.navigate('BuscarPacienteArkive')}
          style={styles.lookupButton}
        />

        {/* Chunk 7 — a veterinarian may have requested access to one of this
            Responsible's animals; this is where they review and approve/
            reject it. Surfaced directly on the root screen (not tucked into
            the account screen) since, unlike most account-level settings,
            a pending request is time-sensitive and actionable. */}
        <AppButton
          title={t('accessRequestsReceived.entryPointButton')}
          variant="outline"
          onPress={() => navigation.navigate('SolicitacoesAcessoRecebidas')}
          style={styles.lookupButton}
        />

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('myAnimals.loading')}
          </Text>
        ) : isError ? (
          <EmptyState
            title={t('myAnimals.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('myAnimals.genericServerError')}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('myAnimals.emptyTitle')}
            message={hasSearch ? t('myAnimals.emptySearchMessage') : t('myAnimals.emptyMessage')}
          />
        ) : (
          data.map((animal) => (
            <AppCard
              key={animal.id}
              onPress={() => navigation.navigate('PacienteDetalhe', { patientId: animal.id })}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{animal.nome}</Text>
              <Text style={{ color: colors.textSecondary }}>{patientSummaryLine(animal)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                {patientArkiveIdLine(animal)}
              </Text>
            </AppCard>
          ))
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lookupButton: { marginBottom: spacing.sm },
});
