import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { StatusBadge } from '../components/StatusBadge';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultas } from '../hooks/useConsultas';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/**
 * Real veterinarian consultation list — GET /api/consultas via TanStack
 * Query, no mock fallback. A failed request renders a real error state; an
 * empty response renders a real empty state.
 *
 * Title row is a normal (non-absolute) flex row — title left, refresh/add
 * icon actions on the right via `HeaderIconButton` — replacing the old
 * bottom-right floating "+" (`commonStyles.fab`) that could sit on top of
 * the last visible card.
 */
export function ConsultasScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data, isPending, isError, error, refetch, isRefetching } = useConsultas();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]} numberOfLines={1}>
            {t('consultasList.title')}
          </Text>
          <View style={styles.actionsRow}>
            {!isPending && !isError ? (
              <HeaderIconButton
                icon="refresh"
                onPress={() => refetch()}
                disabled={isRefetching}
                loading={isRefetching}
                accessibilityLabel={t('consultasList.refreshAccessibilityLabel')}
              />
            ) : null}
            <HeaderIconButton
              icon="add"
              onPress={() => navigation.navigate('CriarConsulta')}
              accessibilityLabel={t('newConsulta.newConsultaAccessibilityLabel')}
            />
          </View>
        </View>

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('consultasList.loading')}
          </Text>
        ) : isError ? (
          <EmptyState
            title={t('consultasList.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('consultasList.genericServerError')}
          />
        ) : data && data.length > 0 ? (
          data
            .slice()
            .sort((a, b) => b.id - a.id)
            .map((consulta) => {
              const dataHora = new Date(consulta.dataHora);
              return (
                <AppCard
                  key={consulta.id}
                  onPress={() =>
                    navigation.navigate('ConsultaDetalhe', { consultaId: consulta.id })
                  }
                >
                  <View style={styles.cardRow}>
                    <Text
                      style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {consulta.animalNome}
                    </Text>
                    <StatusBadge
                      label={consulta.statusDescricao}
                      tone={consultaStatusPresentation(consulta.status).tone}
                    />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'monospace' }}>
                    {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
                  </Text>
                  <View style={styles.dateTimeRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDate(dataHora)}</Text>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textSecondary}
                      style={styles.timeIcon}
                    />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTime(dataHora)}</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }} numberOfLines={2}>
                    {consulta.motivo}
                  </Text>
                </AppCard>
              );
            })
        ) : (
          <EmptyState title={t('consultasList.emptyTitle')} message={t('consultasList.emptyMessage')} />
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
  actionsRow: { flexDirection: 'row' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.xs },
  dateTimeText: { fontSize: fontSize.sm, fontWeight: '700', marginLeft: spacing.xs },
  timeIcon: { marginLeft: spacing.md },
});
