import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchBar } from '../components/SearchBar';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useMyPatients } from '../hooks/usePatients';
import { patientSummaryLine, patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

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
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const trimmedSearch = debouncedSearch.trim();
  const { data, isPending, isError, error } = useMyPatients({ busca: trimmedSearch || undefined });

  const hasSearch = trimmedSearch.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]} numberOfLines={1}>
            {t('patientsList.title')}
          </Text>
          <HeaderIconButton
            icon="person-add"
            onPress={() => navigation.navigate('NovoPaciente')}
            accessibilityLabel={t('patientsList.addAccessibilityLabel')}
          />
        </View>

        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder={t('patientsList.searchPlaceholder')} />

        {/* Visible secondary action, not tucked behind an icon — retrieval
            only (same read-authorization rule as any other patient fetch),
            never a shortcut to create/import a patient. */}
        <AppButton
          title={t('patientsList.lookupByArkiveId')}
          variant="outline"
          onPress={() => navigation.navigate('BuscarPacienteArkive')}
          style={styles.lookupButton}
        />

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('patientsList.loading')}
          </Text>
        ) : isError ? (
          <EmptyState
            title={t('patientsList.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('patientsList.genericServerError')}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('patientsList.emptyTitle')}
            message={hasSearch ? t('patientsList.emptySearchMessage') : t('patientsList.emptyMessage')}
            actionLabel={hasSearch ? undefined : t('patientsList.registerButton')}
            onAction={hasSearch ? undefined : () => navigation.navigate('NovoPaciente')}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pageTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  lookupButton: { marginBottom: spacing.sm },
});
