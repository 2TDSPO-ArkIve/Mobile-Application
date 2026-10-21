import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ArkiveIdField } from '../components/ArkiveIdField';
import { ListRow } from '../components/ListRow';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useAnimalTutores } from '../hooks/useTutores';
import { AnimalObservationCard } from '../components/AnimalObservationCard';
import { formatAge } from '../utils/localeFormat';
import { patientSummaryLine } from '../utils/patientDisplay';
import { spacing, fontSize, font, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { describeLoadError } from '../utils/errorMessages';

/**
 * Shared read-only patient display, mounted from TWO different navigators —
 * `AppStack` (VETERINARIO, with the Editar action) and `ResponsavelAppStack`
 * (RESPONSAVEL, strictly read-only). Route/nav types are therefore
 * deliberately NOT bound to either big `AppStackParamList`/
 * `ResponsavelAppStackParamList` — a minimal inline param shape keeps this
 * screen correct under both stacks instead of lying about which one it's
 * actually in.
 *
 * Deliberately shows no "owner veterinarian" — that relationship doesn't
 * exist (Animal -> Clínica, not Animal -> Veterinário). No Excluir/Desativar
 * action either: the backend forbids both for VETERINARIO
 * (`AnimalService.exigirPermissaoAdministrativaAnimal`), and RESPONSAVEL never
 * gets a write action here at all — only `isVeterinario` sees Editar.
 *
 * The one extra request this screen pays for (beyond the patient itself) is
 * its own active responsible-person relationships — cheap here because it's
 * exactly one patient, unlike a list/selector card where the same fetch per
 * row would be an unbounded N+1 (see `patientDisplay.ts`'s note on why list
 * cards don't show the responsible person's name).
 */
type PatientDetailRouteParamList = { PacienteDetalhe: { patientId: number } };
type PatientDetailNavigationParamList = {
  EditarPaciente: { patientId: number };
  /** RESPONSAVEL's own edit route (`EditAnimalScreen`, registered only in `ResponsavelAppStack`) — see that screen's own doc comment for why it's separate from `EditarPaciente`. */
  EditarAnimal: { patientId: number };
  CompartilharPaciente: { patientId: number };
  HistoricoPaciente: { patientId: number };
  CustosPaciente: { patientId: number };
  /** New permanent report history — registered in BOTH stacks (read-only for VETERINARIO), unlike `EditarAnimal`. */
  RelatosAnimal: { patientId: number };
};

export function PatientDetailScreen() {
  const route = useRoute<RouteProp<PatientDetailRouteParamList, 'PacienteDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PatientDetailNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isVeterinario, isResponsavel } = useAuth();
  const wide = useBreakpoint() === 'wide';
  const { data: patient, isPending, isError, error, refetch } = usePatient(route.params.patientId);
  const { data: tutores } = useAnimalTutores(patient?.id ?? null);
  const currentTutor = tutores?.find((rel) => rel.principal === 'S') ?? tutores?.[0] ?? null;

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientDetail.title')} />
        <LoadingState message={t('patientDetail.loading')} />
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientDetail.title')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('patientDetail.loadErrorTitle')}
            message={describeLoadError(error, t('patientDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetch()}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('patientDetail.title')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        {/* Cover. The ArkIve id is permanent, opaque and NOT secret — readable,
            copyable, never masked; a neutral message (never the database id)
            shows if it's unexpectedly missing. */}
        <View style={styles.cover}>
          <Text style={[styles.coverName, { color: colors.ink }]} numberOfLines={2}>
            {patient.nome}
          </Text>
          <Text style={{ color: colors.inkSecondary, marginBottom: spacing.md }}>{patientSummaryLine(patient)}</Text>
          <ArkiveIdField arkivePatientId={patient.arkivePatientId} />
        </View>

        <AppCard>
          <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
            {t('patientDetail.dataSection')}
          </Text>
          <View style={styles.fields}>
            {[
              [t('patientDetail.speciesLabel'), patient.especieNome],
              [t('patientDetail.breedLabel'), patient.racaNome ?? t('common.notInformedFeminine')],
              [
                t('patientDetail.sexLabel'),
                patient.sexo === 'M' ? t('common.male') : patient.sexo === 'F' ? t('common.female') : t('common.notInformed'),
              ],
              [t('patientDetail.neuteredLabel'), patient.castrado === 'S' ? t('common.yes') : t('common.no')],
              ...(patient.dataNascimento ? [[t('patientDetail.ageLabel'), formatAge(patient.dataNascimento)]] : []),
              [t('patientDetail.tutorField'), currentTutor ? currentTutor.responsavelNome : t('patientDetail.tutorNone')],
              ...(patient.clinicaNome ? [[t('patientDetail.clinicLabel'), patient.clinicaNome]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.fieldItem}>
                <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>{label}</Text>
                <Text style={[styles.fieldValue, { color: colors.ink }]}>{value}</Text>
              </View>
            ))}
          </View>
        </AppCard>

        {isVeterinario ? (
          <AppButton
            title={t('patientDetail.editButton')}
            variant="secondary"
            icon="create-outline"
            onPress={() => navigation.navigate('EditarPaciente', { patientId: patient.id })}
          />
        ) : null}

        {/* Shown to every RESPONSAVEL regardless of whether THIS specific
            animal is one they're actively linked to (e.g. vs. one shared
            with them read-only) — Java alone decides via
            `exigirResponsavelVinculado` (403 if not linked), same pattern as
            every other action below. Never inferred client-side from the
            numeric id alone. */}
        {isResponsavel ? (
          <AppButton
            title={t('patientDetail.editAnimalButton')}
            variant="secondary"
            icon="create-outline"
            onPress={() => navigation.navigate('EditarAnimal', { patientId: patient.id })}
          />
        ) : null}

        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.groupLabel, { color: colors.inkSecondary }]}>
          {t('patientDetail.clinicalGroup')}
        </Text>
        <AppCard style={styles.group}>
          {/* Same shared action for both roles — Java authorizes RESPONSAVEL
              read access to `GET /api/animais/{id}/historico` identically to
              VETERINARIO; not gated by `isVeterinario`. */}
          <ListRow
            icon="time-outline"
            title={t('patientDetail.historyButton')}
            onPress={() => navigation.navigate('HistoricoPaciente', { patientId: patient.id })}
          />
          {/* Same cross-role read-only dashboard — `GET /api/animais/{id}/custos` is authorized identically for VETERINARIO/RESPONSAVEL; price EDITING stays exclusive to the veterinarian's own consultation/prescription forms, never here. */}
          <ListRow
            icon="cash-outline"
            title={t('patientDetail.costsButton')}
            onPress={() => navigation.navigate('CustosPaciente', { patientId: patient.id })}
          />
          {/* New permanent report history (Java V18) — RESPONSAVEL-only entry
              point here, deliberately distinct from the pending-observation
              card below: "Relatos e observações" (this row) is a growing,
              permanent history; "Observações para a próxima consulta" (the
              card below) is a single note Java snapshots into one consultation
              and clears. Never two entries with the same label, never merged
              into one feature. The veterinarian's own entry point to the same
              read-only history lives on ConsultaDetailScreen's eye icon, not
              here. */}
          {isResponsavel ? (
            <ListRow
              icon="document-text-outline"
              title={t('patientDetail.reportsButton')}
              onPress={() => navigation.navigate('RelatosAnimal', { patientId: patient.id })}
            />
          ) : null}
        </AppCard>

        {/* Both VETERINARIO and RESPONSAVEL may share a patient they
            legitimately have access to — confirmed against
            `ClinicalAccessService.exigirCriacaoCompartilhamentoAnimal`. */}
        <Text accessibilityRole="header" style={[commonStyles.eyebrow, styles.groupLabel, { color: colors.inkSecondary }]}>
          {t('patientDetail.shareGroup')}
        </Text>
        <AppCard style={styles.group}>
          <ListRow
            icon="share-social-outline"
            title={t('patientDetail.shareButton')}
            onPress={() => navigation.navigate('CompartilharPaciente', { patientId: patient.id })}
          />
        </AppCard>

        {/* RESPONSAVEL-only pending note for the NEXT consultation — see
            AnimalObservationCard's own doc comment for the pending-vs-snapshot
            distinction. Never rendered for VETERINARIO (the endpoint itself
            is RESPONSAVEL-only server-side; this gate just avoids an
            inevitable 403 request). */}
        {isResponsavel ? <AnimalObservationCard animalId={patient.id} /> : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  coverName: { fontSize: fontSize.xxl, lineHeight: 30, ...font('bold'), marginBottom: spacing.xs },
  // Two columns of label over value; long values wrap inside their column.
  fields: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  fieldItem: { width: '50%', paddingRight: spacing.sm },
  fieldLabel: { fontSize: fontSize.xs },
  fieldValue: { fontSize: fontSize.md, ...font('medium'), marginTop: 2 },
  groupLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { padding: 0, overflow: 'hidden' },
});
