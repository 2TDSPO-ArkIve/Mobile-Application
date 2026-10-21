import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchBar } from '../components/SearchBar';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { ListRow } from '../components/ListRow';
import { StatusBadge } from '../components/StatusBadge';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useReceivedAccessRequests } from '../hooks/usePatientAccessRequests';
import { useTranslation } from '../i18n/useTranslation';
import { useMyAnimals } from '../hooks/usePatients';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { patientSummaryLine, patientArkiveIdLine } from '../utils/patientDisplay';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, radius, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The RESPONSAVEL root screen — the entry point to the responsible person's
 * ArkIve shell. Deliberately NOT a reskin of the veterinarian `PatientsScreen`:
 * that screen is wired to `GET /api/animais/me` (VETERINARIO-scoped); this one
 * uses `useMyAnimals` -> `GET /api/animais` (confirmed RESPONSAVEL-scoped
 * server-side — see `listAccessibleAnimals`'s own note). `HomeHeader`'s
 * account button is pointed at `MinhaConta` instead of the veterinarian-only
 * `Perfil`.
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
  const wide = useBreakpoint() === 'wide';
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
  const animalsQuery = useMyAnimals({ busca: trimmedSearch || undefined });
  const { isPending, isError, error } = animalsQuery;
  const data = animalsQuery.data?.pages.flatMap((page) => page.content);
  // ponytail: counts the first page only (default page size); fine while pending requests stay few.
  const pendingCount = useReceivedAccessRequests({ status: 'PENDING' }).data?.length ?? 0;

  const hasSearch = trimmedSearch.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader
        account={{
          onPress: () => navigation.navigate('MinhaConta'),
          label: t('myAnimals.accountAccessibilityLabel'),
        }}
      />

      <ScreenContainer style={wide ? { maxWidth: layout.contentMax } : undefined} onRefresh={animalsQuery.refetch}>
        <Text style={[styles.pageTitle, { color: colors.ink }]} numberOfLines={1}>
          {t('myAnimals.title')}
        </Text>

        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder={t('myAnimals.searchPlaceholder')} />

        {/* "Buscar por ID ArkIve" opens an already-authorized shared patient: retrieval only, never a path to creating a new animal. */}
        <View style={styles.actionsRow}>
          <AppButton
            title={t('myAnimals.createButton')}
            icon="add"
            onPress={() => navigation.navigate('CadastrarAnimal')}
            style={styles.action}
          />
          <AppButton
            title={t('myAnimals.lookupByArkiveId')}
            variant="secondary"
            onPress={() => navigation.navigate('BuscarPacienteArkive')}
            style={styles.action}
          />
        </View>

        {/* Chunk 7: a veterinarian may have requested access to one of this
            Responsible's animals. Surfaced on the root screen (not the
            account screen) since a pending request is time-sensitive. */}
        <AppCard style={styles.group}>
          <ListRow
            icon="shield-checkmark-outline"
            title={t('accessRequestsReceived.entryPointButton')}
            trailing={
              pendingCount > 0 ? (
                <StatusBadge
                  tone="warning"
                  label={
                    pendingCount === 1
                      ? t('accessRequestsReceived.pendingCountOne')
                      : t('accessRequestsReceived.pendingCount', { count: pendingCount })
                  }
                />
              ) : undefined
            }
            onPress={() => navigation.navigate('SolicitacoesAcessoRecebidas')}
          />
        </AppCard>

        {isPending ? (
          <LoadingState message={t('myAnimals.loading')} />
        ) : isError ? (
          <EmptyState
            tone="error"
            title={t('myAnimals.loadErrorTitle')}
            message={describeLoadError(error)}
            actionLabel={t('common.tryAgain')}
            onAction={() => animalsQuery.refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('myAnimals.emptyTitle')}
            message={hasSearch ? t('myAnimals.emptySearchMessage') : t('myAnimals.emptyMessage')}
            actionLabel={hasSearch ? undefined : t('myAnimals.createButton')}
            onAction={hasSearch ? undefined : () => navigation.navigate('CadastrarAnimal')}
          />
        ) : (
          <>
            {data.map((animal) => (
              <AppCard
                key={animal.id}
                onPress={() => navigation.navigate('PacienteDetalhe', { patientId: animal.id })}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.initial, { backgroundColor: colors.accentTint }]}>
                    <Text style={[styles.initialText, { color: colors.accent }]}>
                      {animal.nome.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={{ color: colors.ink, ...font('bold') }} numberOfLines={1}>
                      {animal.nome}
                    </Text>
                    <Text style={{ color: colors.inkSecondary }} numberOfLines={1}>
                      {patientSummaryLine(animal)}
                    </Text>
                    <Text style={{ color: colors.inkSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
                      {patientArkiveIdLine(animal)}
                    </Text>
                  </View>
                </View>
              </AppCard>
            ))}
            <LoadMoreButton query={animalsQuery} />
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: fontSize.xl, ...font('bold'), marginBottom: spacing.md, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  action: { flex: 1 },
  group: { padding: 0, overflow: 'hidden', marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  initial: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: fontSize.lg, ...font('bold') },
  cardText: { flex: 1, gap: 2 },
});
