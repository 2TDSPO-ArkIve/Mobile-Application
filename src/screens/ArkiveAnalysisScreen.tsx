import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { VoiceOrb } from '../components/VoiceOrb';
import { CancelConsultaModal } from '../components/CancelConsultaModal';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useClinicalSupportGeneration } from '../hooks/useClinicalSupportGeneration';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';

// Truthful, rotating status copy — never claims an action we can't prove
// (no "consultando N estudos"/"pesquisando artigos"/"validando diagnóstico").
// This screen's real job, besides informing the veterinarian, is to absorb
// the clinical engine's cold-start window without it ever reading as a
// failure — recovery here is GET-only and bounded (see
// `useClinicalSupportGeneration`), reaching `uncertain` rather than
// retrying/rotating forever once that window elapses.
const MESSAGE_KEYS = ['aiAnalysis.rotating1', 'aiAnalysis.rotating2', 'aiAnalysis.rotating3'] as const;
const MESSAGE_INTERVAL_MS = 3500;

/**
 * Dedicated full-screen analysis experience. Generation/recovery is fully
 * owned by `useClinicalSupportGeneration` — this screen only starts it once
 * on mount and reacts to the resulting phase; it never touches the POST/GET
 * calls directly, so the cold-start recovery logic exists in exactly one
 * place. Reaching `error` phase here means a genuine non-transient failure
 * (permission/validation/not-found) — a transient infrastructure failure or
 * a 409 never leaves `analyzing` directly; it falls into bounded, GET-only
 * recovery first (never an automatic second POST) and only reaches
 * `uncertain` if that recovery window elapses with no definitive answer.
 *
 * Back navigation stays available throughout: persistent retry is not the
 * same as trapping the veterinarian on this screen. Leaving simply lets the
 * hook's mount guard stop every local timer/loop — the server-side workflow
 * may keep processing independently.
 *
 * Chunk 4: also reachable to cancel the consultation mid-analysis (EP->CA is
 * allowed), and reacts to the hook's full phase set — `canceled` (a real
 * status read confirmed CA, most likely via the cancel action on THIS
 * screen, but possibly from another device/session), `uncertain` (a bounded
 * recovery window elapsed with no definitive answer — never silently
 * promised as "still working"), and `unavailable` (the consultation ended up
 * FI without ever generating ArkIve support, e.g. via the EP->FI-without-
 * analysis path from another session, or AG — nothing to recover here).
 *
 * Correction: navigation to Insight now gates strictly on the explicit
 * `completed` phase, never on `idle`. `idle` and `analyzing` both existed
 * simultaneously across the hook's two mount effects in the first render's
 * passive-effect flush — the effect checking for "done" read the STALE
 * `idle` closure from the initial render even though `generate()` (called by
 * the earlier effect in the same flush) had already synchronously called
 * `setPhase('analyzing')`, because that state update only applies on the
 * NEXT render. `idle` could therefore read as true on the very first effect
 * pass, before generation had even started, and fire a premature redirect.
 * `completed` is set ONLY inside the hook's `finishSuccess`, which is only
 * ever reached after a confirmed persisted GET — it can never be the stale
 * initial-render value, so this race is structurally impossible now.
 */
export function ArkiveAnalysisScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'AnaliseArkive'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { consultaId } = route.params;

  const { phase, errorMessage, isSlow, generate, recheck } = useClinicalSupportGeneration(consultaId);
  const [messageIndex, setMessageIndex] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    generate();
    // Intentionally runs once on mount only — the hook itself owns every
    // subsequent retry/poll while a transient failure persists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'completed') {
      navigation.replace('InsightArkive', { consultaId });
    }
  }, [phase, consultaId, navigation]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % MESSAGE_KEYS.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('aiAnalysis.title')} />

      <ScreenContainer>
        <View style={styles.center}>
          <VoiceOrb mode="analyzing" />

          {phase === 'canceled' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('aiAnalysis.canceledTitle')}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{t('aiAnalysis.canceledMessage')}</Text>
              <AppButton
                title={t('aiAnalysis.backToConsultation')}
                onPress={() => navigation.popTo('ConsultaDetalhe', { consultaId })}
                style={styles.actionButton}
              />
            </>
          ) : phase === 'unavailable' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('aiAnalysis.unavailableTitle')}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{t('aiAnalysis.unavailableMessage')}</Text>
              <AppButton
                title={t('aiAnalysis.backToConsultation')}
                onPress={() => navigation.popTo('ConsultaDetalhe', { consultaId })}
                style={styles.actionButton}
              />
            </>
          ) : phase === 'uncertain' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('aiAnalysis.uncertainTitle')}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{errorMessage}</Text>

              <AppButton title={t('aiAnalysis.recheckButton')} onPress={recheck} style={styles.actionButton} />
              <AppButton
                title={t('common.tryAgain')}
                variant="outline"
                onPress={generate}
                style={styles.actionButton}
              />
              <AppButton
                title={t('aiAnalysis.backToNarrative')}
                variant="ghost"
                onPress={() => navigation.goBack()}
                style={styles.actionButton}
              />
            </>
          ) : phase === 'error' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('aiAnalysis.errorTitle')}</Text>
              <Text style={[styles.message, { color: colors.error }]}>{errorMessage}</Text>

              <AppButton title={t('common.tryAgain')} onPress={generate} style={styles.actionButton} />
              <AppButton
                title={t('aiAnalysis.backToNarrative')}
                variant="outline"
                onPress={() => navigation.goBack()}
                style={styles.actionButton}
              />
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('aiAnalysis.analyzingTitle')}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {t('aiAnalysis.analyzingSubtitle')}
              </Text>
              <Text style={[styles.rotating, { color: colors.primary }]}>{t(MESSAGE_KEYS[messageIndex])}</Text>

              {isSlow ? (
                <Text style={[styles.slow, { color: colors.textSecondary }]}>{t('aiAnalysis.slowMessage')}</Text>
              ) : null}

              <AppButton
                title={t('cancelConsulta.action')}
                variant="danger"
                onPress={() => setCancelModalOpen(true)}
                style={styles.actionButton}
              />
            </>
          )}
        </View>
      </ScreenContainer>

      <CancelConsultaModal
        visible={cancelModalOpen}
        consultaId={consultaId}
        onClose={() => setCancelModalOpen(false)}
        onCancelled={() => {
          setCancelModalOpen(false);
          // Immediately reflect the cancellation rather than waiting for the
          // hook's own in-progress polling loop (if any) to notice it on its
          // next cycle — `recheck()` is the safe, POST-free re-evaluation.
          recheck();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  message: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  rotating: { fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
  slow: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.lg, lineHeight: 20 },
  actionButton: { marginTop: spacing.md, alignSelf: 'stretch' },
});
