import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTrail } from '../components/StatusTrail';
import { ArkiveIdField } from '../components/ArkiveIdField';
import { EmptyState } from '../components/EmptyState';
import { ClinicalIntake } from '../components/ClinicalIntake';
import { ClinicalSupportCard } from '../components/ClinicalSupportCard';
import { ConfirmedDiagnosisCard } from '../components/ConfirmedDiagnosisCard';
import { CancelConsultaModal } from '../components/CancelConsultaModal';
import { DeleteConsultaModal } from '../components/DeleteConsultaModal';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/useTranslation';
import {
  useConsulta,
  useConsultaClinicalSupport,
  useSaveNarrativa,
  useStartConsulta,
} from '../hooks/useConsultas';
import { useConsultaDiagnosticos } from '../hooks/useDiagnosticos';
import { useAnimalReportsPresence } from '../hooks/useAnimalReports';
import { findConfirmedDiagnosis } from '../services/diagnosticoService';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { describeNarrativeSaveError, describeLoadError } from '../utils/errorMessages';
import { formatDate, formatTime, formatCurrency } from '../utils/localeFormat';
import { t } from '../i18n/store';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, lineHeight, font, layout } from '../styles/theme';
import { shadows } from '../styles/shadows';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';

function formatContextLine(dataHora: string, modalidade: string): string {
  const date = new Date(dataHora);
  const modalidadeLabel = modalidade === 'PRESENCIAL' ? t('home.presencial') : t('home.remota');
  if (Number.isNaN(date.getTime())) return modalidadeLabel;
  const dateLabel = formatDate(date);
  const timeLabel = formatTime(date);
  return `${modalidadeLabel} · ${dateLabel} · ${timeLabel}`;
}

/**
 * Status router for a consultation:
 * - AG/CA/FI keep the existing card-based read/action layout.
 * - EP renders the dedicated ArkIve clinical intake experience
 *   (`ClinicalIntake`) — no separate Save step; "Analisar com ArkIve"
 *   persists the narrative, then (only on success) navigates to the
 *   dedicated analysis screen, which owns generation/recovery independently.
 * - AP redirects immediately to the dedicated insight screen — reopening a
 *   consultation already awaiting the vet's review should never show a
 *   recording screen again.
 */
export function ConsultaDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'ConsultaDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useBreakpoint() === 'wide';
  const { t } = useTranslation();
  const { consultaId } = route.params;

  const { data: consulta, isPending, isError, error, refetch } = useConsulta(consultaId);
  const startMutation = useStartConsulta(consultaId);
  const saveNarrativa = useSaveNarrativa(consultaId);

  const diagnosticosEnabled = consulta?.status === 'FI';
  const diagnosticos = useConsultaDiagnosticos(consultaId, { enabled: diagnosticosEnabled });
  const confirmedDiagnosis = diagnosticos.data ? findConfirmedDiagnosis(diagnosticos.data) : undefined;
  const clinicalSupport = useConsultaClinicalSupport(consultaId, { enabled: consulta?.status === 'FI' });

  /**
   * Chunk 9 — backs the reports icon's visibility, never its own narrative/clinical
   * data: a cheap `page=0&size=1` presence check (see the hook's own doc
   * comment), not the full report history. "Do not mistake an API error for
   * zero reports" — the icon stays visible on `isPending`/`isError` too, and
   * is hidden ONLY on a confirmed successful response with zero results, so a
   * transient failure never hides a veterinarian's access to real reports.
   */
  const reportsPresence = useAnimalReportsPresence(consulta?.animalId ?? null);
  const showReportsAction = !(reportsPresence.isSuccess && reportsPresence.data.totalElements === 0);

  const [actionError, setActionError] = useState('');
  const [proceeding, setProceeding] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // AP means the veterinarian already asked ArkIve to analyze this case —
  // reopening it should land on the insight screen, never back on an EP-shaped
  // recording UI.
  useEffect(() => {
    if (consulta?.status === 'AP') {
      navigation.replace('InsightArkive', { consultaId });
    }
  }, [consulta?.status, consultaId, navigation]);

  const handleStart = async () => {
    setActionError('');
    try {
      await startMutation.mutateAsync();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('consultaDetail.startError'));
    }
  };

  // The critical invariant: PATCH narrativa must complete successfully
  // BEFORE navigating to the analysis screen (which is the only place that
  // ever calls POST suporte-clinico). If the save rejects, this throws and
  // ClinicalIntake shows the error inline — no navigation, no AI call.
  const handleAnalyze = async (narrativa: string) => {
    try {
      await saveNarrativa.mutateAsync(narrativa);
    } catch (err) {
      throw new Error(describeNarrativeSaveError(err));
    }
    navigation.navigate('AnaliseArkive', { consultaId });
  };

  // Chunk 4 — "Prosseguir sem análise ArkIve": the backend already allows
  // EP->FI directly. A non-blank narrative is still saved first (same
  // save-then-navigate invariant as handleAnalyze — never discard typed
  // notes), but a blank one is simply never PATCHed (Java's own
  // `@NotBlank` would reject an empty value anyway, and inventing
  // placeholder text would misrepresent the vet's own notes). No AI call
  // happens on this path at all.
  const handleProceedWithoutAnalysis = async (narrativa: string) => {
    setProceeding(true);
    try {
      if (narrativa.trim()) {
        try {
          await saveNarrativa.mutateAsync(narrativa);
        } catch (err) {
          throw new Error(describeNarrativeSaveError(err));
        }
      }
      navigation.navigate('ConclusaoVeterinaria', { consultaId });
    } finally {
      setProceeding(false);
    }
  };

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('consultaDetail.genericTitle')} />
        <LoadingState message={t('consultaDetail.loading')} />
      </View>
    );
  }

  if (isError || !consulta) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('consultaDetail.genericTitle')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('consultaDetail.loadErrorTitle')}
            message={describeLoadError(error, t('consultaDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  // EP: the dedicated clinical intake experience — no status card, no
  // Salvar button, no voice-language chips.
  if (consulta.status === 'EP') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader
          title={t('consultaDetail.title', { id: consulta.id })}
          actions={
            showReportsAction
              ? [
                  {
                    icon: 'chatbubbles-outline',
                    onPress: () => navigation.navigate('RelatosAnimal', { patientId: consulta.animalId }),
                    accessibilityLabel: t('consultaDetail.viewReportsAccessibilityLabel'),
                  },
                ]
              : []
          }
        />
        <ScreenContainer style={wide ? { maxWidth: layout.contentMax } : undefined}>
          <StatusTrail status={consulta.status} />
          <ClinicalIntake
            animalNome={consulta.animalNome}
            animalArkivePatientId={consulta.animalArkivePatientId}
            contextLine={formatContextLine(consulta.dataHora, consulta.modalidade)}
            motivo={consulta.motivo}
            initialNarrativa={consulta.transcricao ?? ''}
            onAnalyze={handleAnalyze}
            analyzing={saveNarrativa.isPending}
            onProceedWithoutAnalysis={handleProceedWithoutAnalysis}
            proceeding={proceeding}
          />

          {/* Cancellation remains reachable from EP too — a slow/undesired
              consultation shouldn't be stuck in the intake screen with no
              way out other than finishing it. */}
          <AppButton
            title={t('cancelConsulta.action')}
            variant="danger"
            onPress={() => setCancelModalOpen(true)}
            style={styles.cancelAction}
          />
        </ScreenContainer>

        <CancelConsultaModal
          visible={cancelModalOpen}
          consultaId={consultaId}
          onClose={() => setCancelModalOpen(false)}
          onCancelled={() => setCancelModalOpen(false)}
        />
      </View>
    );
  }

  // AP redirects (see the effect above) — render nothing while that happens.
  if (consulta.status === 'AP') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('consultaDetail.title', { id: consulta.id })} />
      </View>
    );
  }

  const canStart = consulta.status === 'AG';
  const canEdit = consulta.status === 'AG';
  const canDelete = consulta.status === 'AG';
  // AG only here — EP has its own cancel action in the branch above, and AP
  // never reaches this render at all (it redirects to InsightArkive, which
  // has its own cancel action). FI/CA are both terminal.
  const canCancel = consulta.status === 'AG';
  const isFinalizada = consulta.status === 'FI';
  const isCancelada = consulta.status === 'CA';

  // The one primary action of each status lives in the fixed footer.
  const footerAction = canStart ? (
    <AppButton title={t('consultaDetail.startConsulta')} onPress={handleStart} loading={startMutation.isPending} />
  ) : isFinalizada ? (
    <AppButton
      title={t('consultaDetail.prescricoesButton')}
      onPress={() => navigation.navigate('Prescricoes', { consultaId: consulta.id })}
    />
  ) : null;

  const patientCard = (
    <AppCard>
      <View style={styles.row}>
        <Text style={[styles.patientName, { color: colors.ink }]} numberOfLines={2}>
          {consulta.animalNome}
        </Text>
        {isCancelada ? (
          <StatusBadge label={consulta.statusDescricao} tone={consultaStatusPresentation(consulta.status).tone} />
        ) : null}
      </View>
      <Text style={[styles.field, { color: colors.inkSecondary }]}>
        {formatContextLine(consulta.dataHora, consulta.modalidade)}
      </Text>
      <ArkiveIdField arkivePatientId={consulta.animalArkivePatientId} />

      {consulta.motivo ? (
        <Text style={[styles.field, { color: colors.ink }]}>
          {t('consultaDetail.reasonLabel', { reason: consulta.motivo })}
        </Text>
      ) : null}

      {consulta.sintomas ? (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>
          {t('consultaDetail.symptomsLabel', { symptoms: consulta.sintomas })}
        </Text>
      ) : null}

      {consulta.peso != null ? (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>
          {t('consultaDetail.weightLabel', { weight: consulta.peso })}
        </Text>
      ) : null}

      {consulta.endereco ? (
        <Text style={[styles.field, { color: colors.inkSecondary }]}>
          {t('consultaDetail.addressLabel', { address: consulta.endereco })}
        </Text>
      ) : null}

      {/* `null` means no cost was recorded — omitted entirely, never R$ 0,00. An explicit 0 IS a real recorded value and must still render. */}
      {consulta.valorConsulta != null ? (
        <View style={styles.valueBlock}>
          <Text style={[commonStyles.eyebrow, { color: colors.inkSecondary }]}>{t('consultaDetail.valueLabel')}</Text>
          <Text style={[styles.field, { color: colors.ink }]}>{formatCurrency(consulta.valorConsulta)}</Text>
        </View>
      ) : null}
    </AppCard>
  );

  /* `consulta.observacaoResponsavel` is a per-consultation SNAPSHOT
     (`DS_OBS_RESPONSAVEL`) Java copies from the animal's pending note the
     moment THIS consultation transitioned AG→EP — never the animal's
     current/still-pending note (`observacao-responsavel` endpoint), and never
     repeated onto any other consultation. Shown regardless of status
     (AG/EP/FI/CA) since it's an immutable historical fact once set. */
  const observationCard = consulta.observacaoResponsavel ? (
    <AppCard>
      <Text style={[styles.label, { color: colors.ink }]}>{t('consultaDetail.responsavelObservationLabel')}</Text>
      <Text style={[styles.field, styles.prose, { color: colors.ink }]}>{consulta.observacaoResponsavel}</Text>
    </AppCard>
  ) : null;

  // Narrative, then the AI card, then the veterinarian's card — the AI → vet
  // order never changes, on any layout.
  const clinicalRecord = isFinalizada ? (
    <>
      {consulta.transcricao ? (
        <AppCard>
          <Text style={[styles.label, { color: colors.ink }]}>{t('consultaDetail.narrativeLabel')}</Text>
          <Text style={[styles.field, styles.prose, { color: colors.ink }]}>{consulta.transcricao}</Text>
        </AppCard>
      ) : null}

      {clinicalSupport.data ? <ClinicalSupportCard support={clinicalSupport.data} /> : null}

      {diagnosticos.isPending ? (
        <LoadingState message={t('consultaDetail.loadingConclusion')} />
      ) : confirmedDiagnosis ? (
        <ConfirmedDiagnosisCard diagnosis={confirmedDiagnosis} conclusao={consulta.observacao} />
      ) : null}
    </>
  ) : null;

  const closedNote =
    isFinalizada || isCancelada ? (
      <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md }}>{t('consultaDetail.closedReadOnly')}</Text>
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('consultaDetail.title', { id: consulta.id })}
        actions={
          showReportsAction
            ? [
                {
                  icon: 'chatbubbles-outline',
                  onPress: () => navigation.navigate('RelatosAnimal', { patientId: consulta.animalId }),
                  accessibilityLabel: t('consultaDetail.viewReportsAccessibilityLabel'),
                },
              ]
            : []
        }
      />

      <ScreenContainer style={wide && isFinalizada ? { maxWidth: layout.contentMax } : undefined}>
        {isCancelada ? null : <StatusTrail status={consulta.status} />}

        {wide && isFinalizada ? (
          <View style={styles.columns}>
            <View style={styles.main}>{clinicalRecord}</View>
            <View style={styles.side}>
              {patientCard}
              {observationCard}
              {closedNote}
            </View>
          </View>
        ) : (
          <>
            {patientCard}
            {observationCard}
            {clinicalRecord}
          </>
        )}

        {isCancelada ? (
          <>
            {/* Java prepends "Cancelamento: <motivo>" into `observacao` itself
                (no separate reason field exists) — rendered here the same
                way the FI branch renders its own conclusion text. */}
            {consulta.observacao ? (
              <AppCard>
                <Text style={[styles.label, { color: colors.ink }]}>{t('cancelConsulta.reasonSectionLabel')}</Text>
                <Text style={[styles.field, styles.prose, { color: colors.ink }]}>{consulta.observacao}</Text>
              </AppCard>
            ) : null}
          </>
        ) : null}

        {wide && isFinalizada ? null : closedNote}

        {canEdit ? (
          <AppButton
            title={t('consultaDetail.editConsulta')}
            variant="secondary"
            onPress={() => navigation.navigate('EditarConsulta', { consultaId: consulta.id })}
          />
        ) : null}

        {canCancel ? (
          <AppButton title={t('cancelConsulta.action')} variant="secondary" onPress={() => setCancelModalOpen(true)} />
        ) : null}

        {canDelete ? (
          <AppButton title={t('consultaDetail.deleteConsulta')} variant="danger" onPress={() => setDeleteModalOpen(true)} />
        ) : null}

        {/* Both end the visit; say how they differ before either modal opens. */}
        {canCancel && canDelete ? (
          <Text style={[styles.actionsHelp, { color: colors.inkSecondary }]}>{t('consultaDetail.cancelVsDelete')}</Text>
        ) : null}
      </ScreenContainer>

      {footerAction ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.raised, paddingBottom: insets.bottom + spacing.sm },
            scheme === 'dark' ? { borderTopWidth: 1, borderTopColor: colors.line } : shadows.md,
          ]}
        >
          <View style={styles.footerInner}>
            {actionError ? (
              <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{actionError}</Text>
            ) : null}
            {footerAction}
          </View>
        </View>
      ) : null}

      <CancelConsultaModal
        visible={cancelModalOpen}
        consultaId={consultaId}
        onClose={() => setCancelModalOpen(false)}
        onCancelled={() => setCancelModalOpen(false)}
      />

      <DeleteConsultaModal
        visible={deleteModalOpen}
        consultaId={consultaId}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => {
          setDeleteModalOpen(false);
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  patientName: { flexShrink: 1, fontSize: fontSize.xl, ...font('bold') },
  label: { fontSize: fontSize.md, ...font('bold') },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  prose: { fontSize: fontSize.md, lineHeight: fontSize.md * lineHeight.body },
  valueBlock: { marginTop: spacing.sm },
  actionsHelp: { fontSize: fontSize.sm, lineHeight: fontSize.sm * lineHeight.body, marginTop: spacing.xs },
  cancelAction: { marginTop: spacing.lg },
  columns: { flexDirection: 'row', gap: spacing.lg },
  main: { flex: 3 },
  side: { flex: 2 },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  footerInner: { width: '100%', maxWidth: layout.formMax, alignSelf: 'center' },
});
