import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta } from '../hooks/useConsultas';
import { usePrescricoesByConsulta } from '../hooks/usePrescricoes';
import { useConsultaResumoPdf } from '../hooks/useConsultaResumoPdf';
import { toDisplayDate } from '../utils/isoDate';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { commonStyles } from '../styles/common';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

/** Real prescription list — GET /api/prescricoes?consultaId=X via TanStack Query, no mock fallback. */
export function PrescricoesScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'Prescricoes'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { consultaId } = route.params;

  const { data: consulta } = useConsulta(consultaId);
  const { data, isPending, isError, error } = usePrescricoesByConsulta(consultaId);
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
      <AppHeader
        title={t('prescricoesList.title')}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NovaPrescricao', { consultaId }),
            accessibilityLabel: t('prescricoesList.newAccessibilityLabel'),
          },
        ]}
      />

      <ScreenContainer>
        {consulta ? (
          <>
            <Text style={[styles.context, { color: colors.textSecondary }]}>
              {consulta.animalNome} · {toDisplayDate(consulta.dataHora.slice(0, 10))}
            </Text>
            <Text style={[styles.context, styles.contextArkiveId, { color: colors.textSecondary }]} selectable>
              {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
            </Text>
          </>
        ) : null}

        {/* Chunk 8 — the header "+" icon alone wasn't discoverable enough;
            this content button is the one visually prominent create action
            (the header icon remains only as a small secondary shortcut, so
            there's no competing primary action). Always visible regardless
            of list state, same NovaPrescricao/consultaId target the header
            icon already uses. */}
        <AppButton
          title={t('prescricoesList.newButton')}
          icon="add"
          onPress={() => navigation.navigate('NovaPrescricao', { consultaId })}
          style={styles.newButton}
        />

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('prescricoesList.loading')}
          </Text>
        ) : isError ? (
          <EmptyState
            title={t('prescricoesList.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('prescricoesList.genericServerError')}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('prescricoesList.emptyTitle')} message={t('prescricoesList.emptyMessage')} />
        ) : (
          data.map((prescricao) => (
            <AppCard
              key={prescricao.id}
              onPress={() =>
                navigation.navigate('PrescricaoDetalhe', { prescricaoId: prescricao.id, consultaId })
              }
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{prescricao.medicamento}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {prescricao.dosagem}
                {prescricao.frequencia ? ` · ${prescricao.frequencia}` : ''}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                {toDisplayDate(prescricao.dataInicio)}
                {prescricao.dataFim ? ` – ${toDisplayDate(prescricao.dataFim)}` : ''}
              </Text>
            </AppCard>
          ))
        )}

        {isFinalizada ? (
          <View style={[styles.pdfSection, { borderTopColor: colors.border }]}>
            <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.xs }]}>
              {t('consultaPdf.sectionTitle')}
            </Text>
            <Text style={[styles.pdfHelper, { color: colors.textSecondary }]}>
              {t('consultaPdf.sectionHelper')}
            </Text>
            {pdfErrorMessage ? (
              <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{pdfErrorMessage}</Text>
            ) : null}
            <AppButton
              title={t('consultaPdf.shareButton')}
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
  // Visually distinct from the prescription cards above — a top border and
  // extra spacing is enough separation, no card/background of its own so it
  // never reads as "just another prescription". Full-width, no fixed
  // desktop sizing — the same responsive content column ScreenContainer
  // already provides handles tablet/web.
  pdfSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  pdfHelper: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
});
