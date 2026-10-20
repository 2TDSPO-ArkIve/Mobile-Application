import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { usePatientHistory } from '../hooks/usePatients';
import { usePatientHistoryPdf } from '../hooks/usePatientHistoryPdf';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { severidadeLabel } from '../utils/severidade';
import { viaAdministracaoLabel } from '../utils/viaAdministracao';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { toDisplayDate } from '../utils/isoDate';
import { describePatientHistoryError } from '../utils/errorMessages';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AnimalHistoryConsultation, AnimalHistoryPrescription } from '../services/patientHistoryService';
import { spacing, fontSize, font, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';

/**
 * Read-only longitudinal clinical timeline — reused by BOTH VETERINARIO
 * (`AppStack`) and RESPONSAVEL (`ResponsavelAppStack`), same minimal inline
 * route-type pattern `PatientDetailScreen` already established. Java is the
 * sole authority on which consultations/fields the authenticated caller may
 * see (`GET /api/animais/{id}/historico`) — this screen renders exactly what
 * it receives and never infers or fabricates data the backend omitted (e.g.
 * no "diagnosis not available yet" placeholder for a non-finalized
 * consultation — that section is simply absent).
 *
 * This is NOT another consultation-detail workflow: nothing here is
 * editable, and there is no navigation into a live consultation from this
 * screen.
 */
type PatientHistoryRouteParamList = { HistoricoPaciente: { patientId: number } };

function PrescriptionRow({ prescricao }: { prescricao: AnimalHistoryPrescription }) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const detailParts = [
    prescricao.dosagem,
    prescricao.frequencia,
    prescricao.viaAdministracao ? viaAdministracaoLabel(prescricao.viaAdministracao) : null,
  ].filter((part): part is string => Boolean(part));

  const periodLine = prescricao.dataInicio
    ? prescricao.dataFim
      ? t('patientHistory.prescriptionPeriod', {
          start: toDisplayDate(prescricao.dataInicio),
          end: toDisplayDate(prescricao.dataFim),
        })
      : t('patientHistory.prescriptionStartOnly', { start: toDisplayDate(prescricao.dataInicio) })
    : null;

  return (
    <View style={styles.prescriptionRow}>
      <Text style={[styles.prescriptionName, { color: colors.ink }]}>{prescricao.medicamento}</Text>
      {detailParts.length > 0 ? (
        <Text style={[styles.prescriptionDetail, { color: colors.inkSecondary }]}>{detailParts.join(' · ')}</Text>
      ) : null}
      {periodLine ? (
        <Text style={[styles.prescriptionDetail, { color: colors.inkSecondary }]}>{periodLine}</Text>
      ) : null}
      {prescricao.instrucoes ? (
        <Text style={[styles.prescriptionDetail, { color: colors.inkSecondary }]}>{prescricao.instrucoes}</Text>
      ) : null}
      {/* `null` means no cost was recorded — omitted, never R$ 0,00. */}
      {prescricao.valorMedicamento != null ? (
        <Text style={[styles.prescriptionDetail, { color: colors.inkSecondary }]}>
          {t('patientHistory.prescriptionCostLabel')}: {formatCurrency(prescricao.valorMedicamento)}
        </Text>
      ) : null}
    </View>
  );
}

function ConsultationCard({ consulta }: { consulta: AnimalHistoryConsultation }) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const date = new Date(consulta.dataHora);
  const hasValidDate = !Number.isNaN(date.getTime());
  const modalidadeLabel = consulta.modalidade === 'PRESENCIAL' ? t('home.presencial') : t('home.remota');
  const tone = consultaStatusPresentation(consulta.status).tone;

  const vetLine = [
    consulta.veterinarioNome ? t('patientHistory.veterinarianLabel', { name: consulta.veterinarioNome }) : null,
    consulta.crmv ? t('patientHistory.crmvLabel', { value: consulta.crmv }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const metaLine = [modalidadeLabel, consulta.clinicaNome].filter(Boolean).join(' · ');

  return (
    <AppCard>
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.ink }]} numberOfLines={1}>
          {hasValidDate ? `${formatDate(date)} ${formatTime(date)}` : ''}
        </Text>
        <StatusBadge label={consulta.statusDescricao} tone={tone} />
      </View>

      {vetLine ? <Text style={[styles.metaText, { color: colors.inkSecondary }]}>{vetLine}</Text> : null}
      {metaLine ? <Text style={[styles.metaText, { color: colors.inkSecondary }]}>{metaLine}</Text> : null}
      {consulta.endereco ? (
        <Text style={[styles.metaText, { color: colors.inkSecondary }]}>
          {t('patientHistory.addressLabel', { address: consulta.endereco })}
        </Text>
      ) : null}

      {consulta.motivo ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('patientHistory.reasonLabel')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{consulta.motivo}</Text>
        </View>
      ) : null}

      {/* Only ever populated by Java for a finalized consultation — never derived/guessed client-side for any other status. */}
      {consulta.diagnosticoConfirmado ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('patientHistory.diagnosisLabel')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{consulta.diagnosticoConfirmado}</Text>
        </View>
      ) : null}

      {consulta.severidadeFinal ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('patientHistory.severityLabel')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{severidadeLabel(consulta.severidadeFinal)}</Text>
        </View>
      ) : null}

      {consulta.conclusao ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('patientHistory.conclusionLabel')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{consulta.conclusao}</Text>
        </View>
      ) : null}

      {/* `null` means no cost was recorded — omitted, never R$ 0,00. An explicit 0 IS a real recorded value. */}
      {consulta.valorConsulta != null ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>{t('patientHistory.valueLabel')}</Text>
          <Text style={[styles.value, { color: colors.ink }]}>{formatCurrency(consulta.valorConsulta)}</Text>
        </View>
      ) : null}

      {consulta.prescricoes.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>
            {t('patientHistory.prescriptionsLabel')}
          </Text>
          {consulta.prescricoes.map((prescricao, index) => (
            <PrescriptionRow key={index} prescricao={prescricao} />
          ))}
        </View>
      ) : null}
    </AppCard>
  );
}

export function PatientHistoryScreen() {
  const route = useRoute<RouteProp<PatientHistoryRouteParamList, 'HistoricoPaciente'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { patientId } = route.params;
  const wide = useBreakpoint() === 'wide';

  const { data, isPending, isError, error, refetch } = usePatientHistory(patientId);
  const pdf = usePatientHistoryPdf(patientId, data?.paciente.nome);

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientHistory.title')} />
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('patientHistory.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientHistory.title')} />
        <ScreenContainer>
          <EmptyState title={t('patientHistory.loadErrorTitle')} message={describePatientHistoryError(error)} />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={data.paciente.nome} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <Text style={[styles.arkiveIdSubtitle, { color: colors.inkSecondary }]} selectable>
          {patientArkiveIdLine(data.paciente)}
        </Text>
        <Text style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
          {t('patientHistory.title')}
        </Text>

        {data.consultas.length === 0 ? (
          <EmptyState title={t('patientHistory.emptyTitle')} message={t('patientHistory.emptyMessage')} />
        ) : (
          data.consultas.map((consulta, index) => <ConsultationCard key={index} consulta={consulta} />)
        )}

        {pdf.errorMessage ? (
          <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{pdf.errorMessage}</Text>
        ) : null}
        <AppButton
          title={t('patientHistory.downloadPdfButton')}
          variant="secondary"
          icon="download-outline"
          onPress={pdf.share}
          loading={pdf.isPending}
          disabled={pdf.isPending}
          style={styles.pdfButton}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdSubtitle: { fontSize: fontSize.xs, ...commonStyles.arkiveId, textAlign: 'center', marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateText: { flex: 1, fontSize: fontSize.md, ...font('bold') },
  metaText: { fontSize: fontSize.sm, marginTop: 2 },
  section: { marginTop: spacing.sm },
  label: {
    fontSize: fontSize.xs,
    ...font('semibold'),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: { fontSize: fontSize.sm, marginTop: 2 },
  prescriptionRow: { marginTop: spacing.xs, paddingLeft: spacing.sm },
  prescriptionName: { fontSize: fontSize.sm, ...font('bold') },
  prescriptionDetail: { fontSize: fontSize.xs, marginTop: 1 },
  pdfButton: { marginTop: spacing.md },
});
