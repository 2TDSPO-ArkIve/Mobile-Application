import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ListRow } from '../components/ListRow';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { usePrescricoesByConsulta } from '../hooks/usePrescricoes';
import { useConsultaResumoPdf } from '../hooks/useConsultaResumoPdf';
import { toDisplayDate } from '../utils/isoDate';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { commonStyles } from '../styles/common';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, layout } from '../styles/theme';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';

/** Real prescription list — GET /api/prescricoes?consultaId=X via TanStack Query, no mock fallback. */
export function PrescricoesScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'Prescricoes'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const { consultaId } = route.params;

  const { data: consulta } = useConsulta(consultaId);
  const { data, isPending, isError, error, refetch } = usePrescricoesByConsulta(consultaId);
  // Independent of the prescription list above — the owner-document section
  // is gated purely on consultation status, never on prescription count (a
  // finalized consultation with zero prescriptions is still a valid PDF).
  const { share: sharePdf, isPending: pdfPending, errorMessage: pdfErrorMessage } = useConsultaResumoPdf(
    consultaId,
    consulta?.animalNome
  );
  const isFinalizada = consulta?.status === 'FI';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('prescricoesList.title')} />

      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined} onRefresh={refetch}>
        {consulta ? (
          <>
            <Text style={[styles.context, { color: colors.inkSecondary }]}>
              {consulta.animalNome} · {toDisplayDate(consulta.dataHora.slice(0, 10))}
            </Text>
            <Text style={[styles.context, styles.contextArkiveId, { color: colors.inkSecondary }]} selectable>
              {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
            </Text>
          </>
        ) : null}

        {/* The one create action (a header "+" duplicated it). Creation is
            only ever valid for a finalized (FI) consultation
            (`PrescricaoService.exigirConsultaFinalizada`), so this must not
            be shown while `consulta` is still loading or its status is
            AG/EP/AP/CA. `NewPrescricaoScreen` itself still re-validates FI
            independently as a second safeguard. */}
        {isFinalizada ? (
          <AppButton
            title={t('prescricoesList.newButton')}
            icon="add"
            onPress={() => navigation.navigate('NovaPrescricao', { consultaId })}
            style={styles.newButton}
          />
        ) : null}

        {isPending ? (
          <LoadingState message={t('prescricoesList.loading')} />
        ) : isError ? (
          <EmptyState
            tone="error"
            title={t('prescricoesList.loadErrorTitle')}
            message={describeLoadError(error)}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('prescricoesList.emptyTitle')} message={t('prescricoesList.emptyMessage')} />
        ) : (
          <AppCard style={styles.list}>
            {data.map((prescricao) => (
              <ListRow
                key={prescricao.id}
                icon="medkit-outline"
                title={prescricao.medicamento}
                subtitle={[prescricao.dosagem, prescricao.frequencia].filter(Boolean).join(' · ')}
                trailing={
                  toDisplayDate(prescricao.dataInicio) +
                  (prescricao.dataFim ? ` – ${toDisplayDate(prescricao.dataFim)}` : '')
                }
                onPress={() =>
                  navigation.navigate('PrescricaoDetalhe', { prescricaoId: prescricao.id, consultaId })
                }
              />
            ))}
          </AppCard>
        )}

        {isFinalizada ? (
          <View style={[styles.pdfSection, { borderTopColor: colors.line }]}>
            <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.xs }]}>
              {t('consultaPdf.sectionTitle')}
            </Text>
            <Text style={[styles.pdfHelper, { color: colors.inkSecondary }]}>
              {t('consultaPdf.sectionHelper')}
            </Text>
            {pdfErrorMessage ? (
              <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{pdfErrorMessage}</Text>
            ) : null}
            <AppButton
              title={t('consultaPdf.shareButton')}
              variant="secondary"
              icon="share-outline"
              onPress={sharePdf}
              loading={pdfPending}
              disabled={pdfPending}
            />
          </View>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  context: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md },
  contextArkiveId: { fontSize: fontSize.xs, marginTop: -spacing.sm },
  newButton: { marginBottom: spacing.md },
  list: { padding: 0, overflow: 'hidden' },
  // Visually distinct from the prescription cards above — a top border and
  // extra spacing is enough separation, no card/background of its own so it
  // never reads as "just another prescription". Full-width, no fixed
  // desktop sizing — the same responsive content column ScreenContainer
  // already provides handles tablet/web.
  pdfSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  pdfHelper: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
});
