import React, { useMemo, useState } from 'react';
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
import { patientSummaryLine, patientFallbackId } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/**
 * One canonical list, sourced from `GET /api/animais/me` — this
 * veterinarian's own accessible patients (registered by them, previously
 * consulted, or same-clinic if they have one; clinic membership is entirely
 * optional server-side). The old "Da clínica"/"Já atendidos" segmented
 * toggle called two endpoints that no longer represent distinct concepts
 * now that Animal isn't clinic-owned — removed rather than kept as a broken
 * client-side approximation of an authorization split Java already owns.
 */
export function PatientsScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');

  const { data, isPending, isError, error } = useMyPatients();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return data ?? [];
    return data.filter(
      (animal) =>
        animal.nome.toLowerCase().includes(q) ||
        animal.especieNome.toLowerCase().includes(q) ||
        (animal.racaNome?.toLowerCase().includes(q) ?? false)
    );
  }, [data, search]);

  const hasSearch = search.trim().length > 0;

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

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('patientsList.searchPlaceholder')} />

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
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('patientsList.emptyTitle')}
            message={hasSearch ? t('patientsList.emptySearchMessage') : t('patientsList.emptyMessage')}
            actionLabel={hasSearch ? undefined : t('patientsList.registerButton')}
            onAction={hasSearch ? undefined : () => navigation.navigate('NovoPaciente')}
          />
        ) : (
          filtered.map((animal) => (
            <AppCard
              key={animal.id}
              onPress={() => navigation.navigate('PacienteDetalhe', { patientId: animal.id })}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{animal.nome}</Text>
              <Text style={{ color: colors.textSecondary }}>{patientSummaryLine(animal)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                {patientFallbackId(animal)}
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
