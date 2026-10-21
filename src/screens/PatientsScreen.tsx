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
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useMyPatients } from '../hooks/usePatients';
import { patientSummaryLine, patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, radius, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * One canonical list, sourced from `GET /api/animais/me` — this
 * veterinarian's own accessible patients (registered by them, previously
 * consulted, or same-clinic if they have one; clinic membership is entirely
 * optional server-side). The old "Da clínica"/"Já atendidos" segmented
 * toggle called two endpoints that no longer represent distinct concepts
 * now that Animal isn't clinic-owned — removed rather than kept as a broken
 * client-side approximation of an authorization split Java already owns.
 *
 * Chunk 1: search is now the backend's unified `busca` (name OR ArkIve id,
 * same pattern as `NewConsultaScreen`'s own patient search), debounced
 * locally, rather than filtering only the already-fetched page client-side —
 * an animal whose ArkIve id matches but this veterinarian cannot access is
 * never returned, since `busca` is applied on top of the same
 * role-authorized query Java already runs for this endpoint.
 */
export function PatientsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const wide = useBreakpoint() === 'wide';
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const trimmedSearch = debouncedSearch.trim();
  const patientsQuery = useMyPatients({ busca: trimmedSearch || undefined });
  const { isPending, isError, error } = patientsQuery;
  const data = patientsQuery.data?.pages.flatMap((page) => page.content);

  const hasSearch = trimmedSearch.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer style={wide ? { maxWidth: layout.contentMax } : undefined} onRefresh={patientsQuery.refetch}>
        <Text style={[styles.pageTitle, { color: colors.ink }]} numberOfLines={1}>
          {t('patientsList.title')}
        </Text>

        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder={t('patientsList.searchPlaceholder')} />

        {/* "Buscar por ID ArkIve" is retrieval only (same read-authorization
            rule as any other patient fetch), never a shortcut to
            create/import a patient. */}
        <View style={styles.actionsRow}>
          <AppButton
            title={t('patientsList.registerButton')}
            icon="person-add-outline"
            onPress={() => navigation.navigate('NovoPaciente')}
            style={styles.action}
          />
          <AppButton
            title={t('patientsList.lookupByArkiveId')}
            variant="secondary"
            onPress={() => navigation.navigate('BuscarPacienteArkive')}
            style={styles.action}
          />
        </View>

        {isPending ? (
          <LoadingState message={t('patientsList.loading')} />
        ) : isError ? (
          <EmptyState
            tone="error"
            title={t('patientsList.loadErrorTitle')}
            message={describeLoadError(error)}
            actionLabel={t('common.tryAgain')}
            onAction={() => patientsQuery.refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('patientsList.emptyTitle')}
            message={hasSearch ? t('patientsList.emptySearchMessage') : t('patientsList.emptyMessage')}
            actionLabel={hasSearch ? undefined : t('patientsList.registerButton')}
            onAction={hasSearch ? undefined : () => navigation.navigate('NovoPaciente')}
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
            <LoadMoreButton query={patientsQuery} />
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: fontSize.xl, ...font('bold'), marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  action: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  initial: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: fontSize.lg, ...font('bold') },
  cardText: { flex: 1, gap: 2 },
});
