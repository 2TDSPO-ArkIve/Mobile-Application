import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { VeterinarianConclusionForm } from '../components/VeterinarianConclusionForm';
import { ClinicalSupportCard } from '../components/ClinicalSupportCard';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useFinalizeConsulta, useConsultaClinicalSupport } from '../hooks/useConsultas';
import { getConsulta } from '../services/consultaService';
import { isTransientInfraError } from '../services/apiClient';
import { describeFinalizeError } from '../utils/errorMessages';
import { queryKeys } from '../query/queryKeys';
import type { FinalizarConsultaRequest } from '../services/consultaService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, font, radius, iconSize, layout } from '../styles/theme';

/**
 * Dedicated finalize-consultation screen (AP -> FI). Reuses
 * `VeterinarianConclusionForm` and `useFinalizeConsulta` completely
 * unchanged — this is purely a navigation-level extraction from
 * ConsultaDetailScreen, not a new finalize contract. The form itself never
 * receives AI-support data as a prop (confirmed in the component), so there
 * is no path for it to prefill diagnosis/severity from the ArkIve insight —
 * the veterinarian's conclusion stays an independent decision. The AI
 * support is shown beside it, read-only — collapsed above the form on
 * phones, fixed on the right on desktop.
 */
export function VeterinarianConclusionScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'ConclusaoVeterinaria'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { consultaId } = route.params;

  const finalizeMutation = useFinalizeConsulta(consultaId);
  const wide = useBreakpoint() === 'wide';
  // No retry: "Prosseguir sem análise" reaches here with no support at all
  // (404), and the card simply stays out.
  const support = useConsultaClinicalSupport(consultaId, { retry: false });
  const [supportOpen, setSupportOpen] = useState(false);

  // Removes AnaliseArkive/InsightArkive/ConclusaoVeterinaria from the stack
  // in one step — ConsultaDetalhe is already sitting underneath (it's how
  // the veterinarian got here), so this is a pop, not a fresh push. That
  // also means Back from the finalized detail never reopens this form or
  // the stale AI-result screen.
  const goToFinalizedDetail = () => {
    navigation.popTo('ConsultaDetalhe', { consultaId });
  };

  const handleSubmit = async (input: FinalizarConsultaRequest) => {
    try {
      await finalizeMutation.mutateAsync(input);
      goToFinalizedDetail();
      return;
    } catch (err) {
      // A deterministic rejection (400/403/404/409/422) means the server
      // told us plainly what happened — no guessing needed, let the mapped
      // error render via finalizeMutation.isError below. Only a genuinely
      // uncertain outcome (the HTTP response itself was lost) is worth a
      // recovery check.
      if (!isTransientInfraError(err)) return;

      // The finalize call may have actually committed server-side even
      // though we never saw its response — check real server state instead
      // of assuming failure. This is a read-only GET, never a repeated
      // POST /finalizar (that would risk a duplicate workflow action).
      try {
        const consulta = await getConsulta(consultaId);
        if (consulta.status === 'FI') {
          queryClient.setQueryData(queryKeys.consultas.detail(consultaId), consulta);
          goToFinalizedDetail();
        }
        // Anything other than FI: it genuinely didn't commit — fall through
        // to the mapped error below.
      } catch {
        // Recovery check itself failed — fall through to the mapped error.
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('conclusion.title')} />
      <ScreenContainer style={wide && support.data ? styles.wideContent : styles.content}>
        {support.data && !wide ? (
          <View style={styles.summary}>
            <Pressable
              onPress={() => setSupportOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: supportOpen }}
              style={[styles.summaryToggle, { backgroundColor: colors.aiTint }]}
            >
              <Ionicons name="sparkles-outline" size={iconSize.md} color={colors.ai} />
              <View style={styles.summaryText}>
                <Text style={[styles.summaryTitle, { color: colors.ai }]}>{t('clinicalSupportCard.title')}</Text>
                {supportOpen ? null : (
                  <Text style={{ color: colors.ink }} numberOfLines={1}>
                    {support.data.hipoteseDiagnostica}
                  </Text>
                )}
              </View>
              <Ionicons name={supportOpen ? 'chevron-up' : 'chevron-down'} size={iconSize.md} color={colors.ai} />
            </Pressable>
            {supportOpen ? <ClinicalSupportCard support={support.data} /> : null}
          </View>
        ) : null}

        <View style={wide && support.data ? styles.columns : null}>
          <View style={wide && support.data ? styles.formColumn : null}>
            <VeterinarianConclusionForm
              onSubmit={handleSubmit}
              isSubmitting={finalizeMutation.isPending}
              errorMessage={finalizeMutation.isError ? describeFinalizeError(finalizeMutation.error) : undefined}
            />
          </View>
          {wide && support.data ? (
            <View style={styles.supportColumn}>
              <ClinicalSupportCard support={support.data} />
            </View>
          ) : null}
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Scoped to this screen only (passed as ScreenContainer's own `style`
  // prop, not a change to the shared component/commonStyles.content) — lets
  // a short form center in the available height instead of sitting packed
  // at the top with dead space below, while `flexGrow: 1` (not a fixed
  // height) still lets the ScrollView grow and scroll normally once the
  // keyboard or a long conclusion pushes content past one screen.
  content: { flexGrow: 1, justifyContent: 'center' },
  wideContent: { maxWidth: layout.contentMax },
  summary: { marginBottom: spacing.lg, gap: spacing.sm },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: fontSize.sm, ...font('semibold') },
  columns: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  formColumn: { flex: 3 },
  // Web only: keeps the AI card in view while the form scrolls.
  supportColumn: {
    flex: 2,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: spacing.md } as unknown as ViewStyle) : null),
  },
});
