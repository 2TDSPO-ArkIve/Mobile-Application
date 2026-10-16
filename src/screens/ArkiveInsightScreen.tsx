import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { VoiceOrb } from '../components/VoiceOrb';
import { ClinicalSupportCard } from '../components/ClinicalSupportCard';
import { CancelConsultaModal } from '../components/CancelConsultaModal';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsulta, useConsultaClinicalSupport } from '../hooks/useConsultas';
import { isSupportNotYetPersisted } from '../services/consultaService';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

const MESSAGE_KEYS = ['aiInsight.rotating1', 'aiInsight.rotating2', 'aiInsight.rotating3'] as const;
const MESSAGE_INTERVAL_MS = 3500;

/**
 * Reads the persisted result via the same safe `GET` the rest of the app
 * already uses (`useConsultaClinicalSupport`, TanStack-cached) rather than
 * receiving the generated support object through navigation params — this
 * is what makes a refresh/reopen always show the real persisted state.
 *
 * Reopening this screen can itself race a still-cold engine (e.g. the
 * analysis screen just confirmed support existed, but the very next GET on
 * remount hits a transient blip, or even a plain 404 right after
 * generation). For that case this keeps retrying the GET automatically and
 * shows the same centered "ArkIve is thinking" loading experience, never
 * the hard "não foi possível carregar" card — that card is reserved for a
 * genuine non-transient failure (auth/validation).
 */
export function ArkiveInsightScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'InsightArkive'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { consultaId } = route.params;

  const { data: consulta, isPending: consultaPending } = useConsulta(consultaId);
  const support = useConsultaClinicalSupport(consultaId, {
    enabled: true,
    // This screen only exists for the AP/finalized-insight flow, where
    // persisted support is expected sooner or later — a 404 here just means
    // "not readable yet" (confirmed physical race right after generation),
    // same as a transient infra error: keep retrying forever with a capped
    // backoff, never surface it as a failure. Only a genuine non-transient,
    // non-404 error (401/403/422/...) stops retrying and shows the card.
    retry: (_failureCount, error) => isSupportNotYetPersisted(error),
    retryDelay: (attempt) => Math.min(4000 + attempt * 2000, 10000),
  });
  const [showNarrative, setShowNarrative] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const hasFailed = support.isError && !isSupportNotYetPersisted(support.error);
  const isWaiting = !support.data && !hasFailed;

  useEffect(() => {
    if (!isWaiting) return;
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % MESSAGE_KEYS.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isWaiting]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('aiInsight.title')} />

      <ScreenContainer style={isWaiting ? styles.waitingContent : undefined}>
        {isWaiting ? (
          <View style={styles.heroWrap}>
            {consulta ? (
              <>
                <Text style={[styles.patientNameSmall, { color: colors.textSecondary }]} numberOfLines={1}>
                  {consulta.animalNome}
                </Text>
                <Text style={[styles.patientArkiveIdSmall, { color: colors.textSecondary }]} numberOfLines={1} selectable>
                  {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
                </Text>
              </>
            ) : null}

            <VoiceOrb mode="analyzing" />

            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('aiInsight.heroTitle')}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {t('aiInsight.heroSubtitle')}
            </Text>
            <Text style={[styles.rotating, { color: colors.primary }]}>{t(MESSAGE_KEYS[messageIndex])}</Text>
            <Text style={[styles.heroHelper, { color: colors.textSecondary }]}>{t('aiInsight.heroHelper')}</Text>

            {consulta?.transcricao ? (
              <Pressable onPress={() => setShowNarrative((current) => !current)} style={styles.collapseHeaderCentered}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('aiInsight.narrativeToggle')}</Text>
                <Ionicons name={showNarrative ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {showNarrative && consulta?.transcricao ? (
              <AppCard style={styles.narrativeCardCentered}>
                <Text style={{ color: colors.text }}>{consulta.transcricao}</Text>
              </AppCard>
            ) : null}

            <AppButton
              title={t('cancelConsulta.action')}
              variant="danger"
              onPress={() => setCancelModalOpen(true)}
              style={styles.cancelButton}
            />
          </View>
        ) : (
          <>
            {consultaPending ? (
              <Text style={{ color: colors.textSecondary }}>{t('consultaDetail.loading')}</Text>
            ) : consulta ? (
              <>
                <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                  {consulta.animalNome}
                </Text>
                <Text style={[styles.patientArkiveId, { color: colors.textSecondary }]} numberOfLines={1} selectable>
                  {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
                </Text>
              </>
            ) : null}

            <Text
              style={[commonStyles.eyebrow, { color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm }]}
            >
              {t('aiInsight.sectionLabel')}
            </Text>

            {support.data ? (
              <ClinicalSupportCard support={support.data} />
            ) : (
              <EmptyState title={t('aiInsight.loadFailedTitle')} message={t('aiInsight.loadFailedMessage')} />
            )}

            {consulta?.transcricao ? (
              <Pressable onPress={() => setShowNarrative((current) => !current)} style={styles.collapseHeader}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('aiInsight.narrativeToggle')}</Text>
                <Ionicons name={showNarrative ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {showNarrative && consulta?.transcricao ? (
              <AppCard>
                <Text style={{ color: colors.text }}>{consulta.transcricao}</Text>
              </AppCard>
            ) : null}

            {support.data ? (
              <AppButton
                title={t('aiInsight.registerConclusion')}
                onPress={() => navigation.navigate('ConclusaoVeterinaria', { consultaId })}
                style={styles.conclusionButton}
              />
            ) : null}

            <AppButton
              title={t('cancelConsulta.action')}
              variant="danger"
              onPress={() => setCancelModalOpen(true)}
              style={styles.cancelButton}
            />
          </>
        )}
      </ScreenContainer>

      <CancelConsultaModal
        visible={cancelModalOpen}
        consultaId={consultaId}
        onClose={() => setCancelModalOpen(false)}
        onCancelled={() => {
          setCancelModalOpen(false);
          // AP->CA just happened — this screen has nothing left to show for
          // this consultation; return to the single underlying
          // ConsultaDetalhe instance, which will now render its CA state.
          navigation.popTo('ConsultaDetalhe', { consultaId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  patientName: { fontSize: fontSize.lg, fontWeight: '700' },
  patientArkiveId: { fontSize: fontSize.xs, marginTop: 2, marginBottom: spacing.xs },
  // Vertically centers the loading hero in the viewport (flexGrow, not a
  // fixed height) — content still scrolls normally if the collapsed
  // narrative is expanded and pushes past one screen.
  waitingContent: { flexGrow: 1, justifyContent: 'center' },
  heroWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  patientNameSmall: { fontSize: fontSize.sm, fontWeight: '600' },
  patientArkiveIdSmall: { fontSize: fontSize.xs, marginTop: 2, marginBottom: spacing.md },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  heroSubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  rotating: { fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
  heroHelper: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
  collapseHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xl,
  },
  narrativeCardCentered: { width: '100%', marginTop: spacing.sm },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  conclusionButton: { marginTop: spacing.lg },
  cancelButton: { marginTop: spacing.lg },
});
