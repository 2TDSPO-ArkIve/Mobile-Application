import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchBar } from '../components/SearchBar';
import { AppCard } from '../components/AppCard';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useMyAnimals } from '../hooks/usePatients';
import { patientSummaryLine, patientFallbackId } from '../utils/patientDisplay';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/**
 * The RESPONSAVEL root screen — the entry point to the responsible person's
 * ArkIve shell. Deliberately NOT a reskin of the veterinarian `PatientsScreen`:
 * that screen is wired to `GET /api/animais/me` (VETERINARIO-scoped); this one
 * uses `useMyAnimals` -> `GET /api/animais` (confirmed RESPONSAVEL-scoped
 * server-side — see `listAccessibleAnimals`'s own note). No create action
 * exists here (RESPONSAVEL cannot register a new patient in this phase), and
 * `AppHeader`'s single action opens the account screen rather than reusing
 * `HomeHeader` (which hardcodes a navigate to the veterinarian-only `Perfil`
 * route and would not even type-check against this stack).
 */
export function MeusAnimaisScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ResponsavelAppStackParamList>>();
  const [search, setSearch] = useState('');

  const { data, isPending, isError, error } = useMyAnimals();

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
      <AppHeader
        title={t('myAnimals.title')}
        showBack={false}
        actions={[
          {
            icon: 'person-circle-outline',
            onPress: () => navigation.navigate('MinhaConta'),
            accessibilityLabel: t('myAnimals.accountAccessibilityLabel'),
          },
        ]}
      />

      <ScreenContainer>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('myAnimals.searchPlaceholder')} />

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('myAnimals.loading')}
          </Text>
        ) : isError ? (
          <EmptyState
            title={t('myAnimals.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('myAnimals.genericServerError')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('myAnimals.emptyTitle')}
            message={hasSearch ? t('myAnimals.emptySearchMessage') : t('myAnimals.emptyMessage')}
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
});
