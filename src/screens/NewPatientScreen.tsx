import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { notify } from '../utils/dialog';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { PatientForm } from '../components/PatientForm';
import { TutorSearchModal } from '../components/TutorSearchModal';
import { AppButton } from '../components/AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTranslation } from '../i18n/useTranslation';
import { useCreatePatient } from '../hooks/usePatients';
import { useLinkTutor } from '../hooks/useTutores';
import { describePatientError } from '../utils/errorMessages';
import type { AnimalRequestInput } from '../services/patientService';
import type { ResponsavelLookupDto } from '../services/responsavelService';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, radius, fontSize, font, layout } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

/**
 * Reachable both from NewConsultaScreen's patient search (when it comes up
 * empty) and from the Patients tab's own "Cadastrar paciente" action.
 * `route.params.returnToConsulta` tells the two apart: only the former hops
 * back to the SAME CriarConsulta screen instance (still on the stack) with
 * the new patient preselected, so motivo/date/time typed before "Cadastrar
 * novo paciente" was tapped are untouched; the latter lands on the new
 * patient's own detail screen instead — "return to a fresh consultation
 * form" would make no sense coming from the Patients tab.
 *
 * Deliberately no same-name warning: two patients legitimately sharing a
 * name (e.g. "Luna") is normal and must be allowed without friction.
 *
 * Tutor linkage is a SEPARATE resource (`AnimalResponsavel`, not a field on
 * `Animal`) — creating the patient and linking the tutor are two requests.
 * If the first succeeds and the second fails, the patient creation is never
 * pretended to have rolled back: the veterinarian is told exactly that
 * ("Paciente cadastrado, mas não foi possível vincular o tutor.") and still
 * lands on the created patient.
 */
export function NewPatientScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'NovoPaciente'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const wide = useBreakpoint() === 'wide';
  const createMutation = useCreatePatient();
  const linkTutorMutation = useLinkTutor();

  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<ResponsavelLookupDto | null>(null);
  const [tutorModalOpen, setTutorModalOpen] = useState(false);

  const handleSubmit = async (payload: AnimalRequestInput) => {
    setError('');
    let created;
    try {
      created = await createMutation.mutateAsync(payload);
    } catch (err) {
      setError(describePatientError(err, false));
      return;
    }

    if (selectedTutor) {
      try {
        await linkTutorMutation.mutateAsync({
          animalId: created.id,
          responsavelId: selectedTutor.id,
          tipoVinculo: 'TUTOR_LEGAL',
          principal: 'S',
        });
      } catch {
        notify(t('tutor.linkFailedTitle'), t('tutor.linkFailedMessage'), t('common.done'));
      }
    }

    if (route.params?.returnToConsulta) {
      // NAV-01 fix — `navigate('CriarConsulta', ...)` did not reliably pop
      // this screen off the stack: `CriarConsulta` was originally reached by
      // bubbling up from the Consultas tab's nested tab navigator, and a
      // later `navigate` call from this sibling `AppStack` screen could add
      // a SECOND `CriarConsulta` entry on top of this one instead of
      // collapsing back to it — leaving `NovoPaciente` (and a stale, now-
      // abandoned `CriarConsulta`) stuck underneath. Deleting the
      // consultation created from that fresh instance then `goBack()`ed onto
      // the leftover `NovoPaciente` instead of the Consultas tab.
      // `popTo` (already the established pattern in this codebase for
      // "return to an existing screen further down the stack, discarding
      // everything pushed after it" — see `ArkiveAnalysisScreen`/
      // `ArkiveInsightScreen`/`VeterinarianConclusionScreen`'s own
      // `popTo('ConsultaDetalhe', ...)` calls) pops straight back to the
      // ORIGINAL `CriarConsulta` instance and merges the new patient in,
      // guaranteeing `NovoPaciente` is removed from the stack.
      navigation.popTo('CriarConsulta', { preselectedAnimal: created });
    } else {
      navigation.replace('PacienteDetalhe', { patientId: created.id });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('patientForm.newTitle')} />
      <ScreenContainer style={wide ? { maxWidth: layout.formMax } : undefined}>
        <PatientForm
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || linkTutorMutation.isPending}
          submitLabel={t('patientForm.createSubmit')}
          errorMessage={error}
        />

        <AppCard>
          <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
            {t('tutor.section')}
          </Text>
          {selectedTutor ? (
            <View style={commonStyles.rowBetween}>
              <Text
                style={{ color: colors.ink, ...font('bold'), flexShrink: 1, marginRight: spacing.sm }}
                numberOfLines={2}
              >
                {t('tutor.selected', { name: selectedTutor.nome })}
              </Text>
              <Pressable
                onPress={() => setSelectedTutor(null)}
                accessibilityRole="button"
                style={(state: InteractionState) => [styles.clearLink, isActive(state) && { backgroundColor: colors.sunken }, focusRing(state, colors)]}
              >
                <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>{t('tutor.clear')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.inkSecondary, marginBottom: spacing.sm }}>{t('tutor.none')}</Text>
              <AppButton
                title={t('tutor.searchButton')}
                variant="secondary"
                icon="search-outline"
                onPress={() => setTutorModalOpen(true)}
              />
            </>
          )}
        </AppCard>
      </ScreenContainer>

      <TutorSearchModal
        visible={tutorModalOpen}
        onClose={() => setTutorModalOpen(false)}
        onSelect={setSelectedTutor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clearLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md },
});
