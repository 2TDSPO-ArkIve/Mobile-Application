import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useAnimalTutores } from '../hooks/useTutores';
import { formatAge } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

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
  CompartilharPaciente: { patientId: number };
  HistoricoPaciente: { patientId: number };
  CustosPaciente: { patientId: number };
};

export function PatientDetailScreen() {
  const route = useRoute<RouteProp<PatientDetailRouteParamList, 'PacienteDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PatientDetailNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isVeterinario } = useAuth();
  const { data: patient, isPending, isError, error, refetch } = usePatient(route.params.patientId);
  const { data: tutores } = useAnimalTutores(patient?.id ?? null);
  const currentTutor = tutores?.find((rel) => rel.principal === 'S') ?? tutores?.[0] ?? null;

  if (isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientDetail.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('patientDetail.loading')}
        </Text>
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('patientDetail.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('patientDetail.loadErrorTitle')}
            message={error instanceof Error ? error.message : t('patientDetail.notFound')}
          />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={patient.nome} />
      <ScreenContainer>
        <AppCard>
          <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.sm }]}>
            {t('patientDetail.dataSection')}
          </Text>
          <Text style={[styles.field, { color: colors.text }]}>{t('patientDetail.nameLabel', { name: patient.nome })}</Text>
          <Text style={[styles.field, { color: colors.text }]}>
            {t('patientDetail.speciesLabel', { species: patient.especieNome })}
          </Text>
          <Text style={[styles.field, { color: colors.text }]}>
            {t('patientDetail.breedLabel', { breed: patient.racaNome ?? t('common.notInformedFeminine') })}
          </Text>
          <Text style={[styles.field, { color: colors.text }]}>
            {t('patientDetail.sexLabel', {
              sex:
                patient.sexo === 'M'
                  ? t('common.male')
                  : patient.sexo === 'F'
                    ? t('common.female')
                    : t('common.notInformed'),
            })}
          </Text>
          <Text style={[styles.field, { color: colors.text }]}>
            {t('patientDetail.neuteredLabel', { value: patient.castrado === 'S' ? t('common.yes') : t('common.no') })}
          </Text>
          {patient.dataNascimento ? (
            <Text style={[styles.field, { color: colors.text }]}>
              {t('patientDetail.ageLabel', { value: formatAge(patient.dataNascimento) })}
            </Text>
          ) : null}
          <Text style={[styles.field, { color: colors.textSecondary }]}>
            {currentTutor
              ? t('patientDetail.tutorLabel', { name: currentTutor.responsavelNome })
              : t('patientDetail.tutorNone')}
          </Text>
          {patient.clinicaNome ? (
            <Text style={[styles.field, { color: colors.textSecondary }]}>
              {t('patientDetail.clinicLabel', { clinic: patient.clinicaNome })}
            </Text>
          ) : null}
          <View style={styles.arkiveIdWrap}>
            <Text style={[styles.arkiveIdLabel, { color: colors.textSecondary }]}>
              {t('patientDetail.arkiveIdLabel')}
            </Text>
            {/* Permanent, opaque, NOT secret — selectable/readable text, never masked or treated as a credential. A neutral message (never the database id) is shown if the ArkIve id is unexpectedly missing. */}
            <Text style={[styles.arkiveIdValue, { color: colors.text }]} selectable>
              {patientArkiveIdLine(patient)}
            </Text>
          </View>
        </AppCard>

        {isVeterinario ? (
          <AppButton
            title={t('patientDetail.editButton')}
            variant="outline"
            onPress={() => navigation.navigate('EditarPaciente', { patientId: patient.id })}
          />
        ) : null}

        {/* Both VETERINARIO and RESPONSAVEL may share a patient they
            legitimately have access to — confirmed against
            `ClinicalAccessService.exigirCriacaoCompartilhamentoAnimal`. */}
        <AppButton
          title={t('patientDetail.shareButton')}
          variant="outline"
          onPress={() => navigation.navigate('CompartilharPaciente', { patientId: patient.id })}
        />

        {/* Same shared action for both roles — Java authorizes RESPONSAVEL
            read access to `GET /api/animais/{id}/historico` identically to
            VETERINARIO; this button is not gated by `isVeterinario`. */}
        <AppButton
          title={t('patientDetail.historyButton')}
          variant="outline"
          onPress={() => navigation.navigate('HistoricoPaciente', { patientId: patient.id })}
        />

        {/* Same cross-role read-only dashboard — `GET /api/animais/{id}/custos` is authorized identically for VETERINARIO/RESPONSAVEL; price EDITING stays exclusive to the veterinarian's own consultation/prescription forms, never here. */}
        <AppButton
          title={t('patientDetail.costsButton')}
          variant="outline"
          onPress={() => navigation.navigate('CustosPaciente', { patientId: patient.id })}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  arkiveIdWrap: { marginTop: spacing.sm },
  arkiveIdLabel: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  arkiveIdValue: { fontSize: fontSize.sm, fontFamily: 'monospace', marginTop: 2 },
});
