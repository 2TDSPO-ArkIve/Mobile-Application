import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePatient } from '../hooks/usePatients';
import { useAnimalReports } from '../hooks/useAnimalReports';
import { describeAnimalReportListError, describeLoadError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { toDisplayDate } from '../utils/isoDate';
import type { AnimalReportDto } from '../services/animalReportService';
import { spacing, radius, fontSize, lineHeight, font } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { LoadingState } from '../components/LoadingState';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { ArkiveIdField } from '../components/ArkiveIdField';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

const SEARCH_DEBOUNCE_MS = 300;
/** A report text past this length gets a "Ver mais" toggle instead of always rendering in full — short reports (the common case: "vomitou de madrugada") never show a pointless toggle. */
const EXPAND_THRESHOLD = 180;

/**
 * Reused by BOTH `AppStack` (VETERINARIO, read-only) and
 * `ResponsavelAppStack` (RESPONSAVEL, read-write) — same minimal inline
 * route/nav-type pattern every other cross-role screen in this app already
 * uses (`PatientDetailScreen`/`ArkiveIdLookupScreen`). `NovoRelatoAnimal`
 * only exists in `ResponsavelAppStackParamList` at runtime; it's only ever
 * navigated to when `isResponsavel` is true (see `handleAddReport` below),
 * exactly the condition under which this screen is actually hosted by that
 * stack in the first place.
 *
 * This is the PERMANENT report history (`GET /api/animais/{id}/relatos`,
 * Java V18) — a completely different feature from `AnimalObservationCard`'s
 * single pending "Observação para a próxima consulta" note, never merged or
 * confused with it in this screen or anywhere else.
 */
type RouteParamList = { RelatosAnimal: { patientId: number } };
type NavParamList = { NovoRelatoAnimal: { patientId: number } };

function ReportCard({ report }: { report: AnimalReportDto }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isLong = report.texto.length > EXPAND_THRESHOLD;
  const createdAt = new Date(report.dataCriacao);
  const hasValidCreatedAt = !Number.isNaN(createdAt.getTime());

  return (
    <AppCard style={styles.reportCard}>
      <Text style={[styles.reportedBy, { color: colors.ink }]}>
        {t('animalReports.reportedByLabel', { name: report.responsavelNome })}
      </Text>
      {hasValidCreatedAt ? (
        <Text style={[styles.meta, { color: colors.inkSecondary }]}>
          {t('animalReports.submittedAtLabel', { date: formatDateTime(createdAt) })}
        </Text>
      ) : null}
      {/* Deliberately a separate line from `submittedAtLabel` — the moment the
          Responsible typed/saved this report is never the same thing as when
          the reported event actually happened. */}
      {report.dataOcorrencia ? (
        <Text style={[styles.meta, { color: colors.inkSecondary }]}>
          {t('animalReports.occurredAtLabel', { date: toDisplayDate(report.dataOcorrencia) })}
        </Text>
      ) : null}
      <Text style={[styles.text, { color: colors.ink }]} numberOfLines={expanded ? undefined : 4}>
        {report.texto}
      </Text>
      {isLong ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={(state: InteractionState) => [styles.expandLink, isActive(state) && { backgroundColor: colors.sunken }, focusRing(state, colors)]}
        >
          <Text style={{ color: colors.accent, ...font('semibold'), fontSize: fontSize.sm }}>
            {expanded ? t('animalReports.collapseButton') : t('animalReports.expandButton')}
          </Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

export function AnimalReportsScreen() {
  const route = useRoute<RouteProp<RouteParamList, 'RelatosAnimal'>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { isResponsavel } = useAuth();
  const { patientId } = route.params;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Chunk 9 — resets pagination implicitly: `debouncedSearch` is part of
  // `useAnimalReports`' query key, so a changed search term is an entirely
  // NEW `useInfiniteQuery` cache entry starting fresh at page 0. Page 2 of a
  // new term is never appended onto page 1 of an old one.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const {
    data: patient,
    isPending: patientPending,
    isError: patientIsError,
    error: patientError,
    refetch: refetchPatient,
  } = usePatient(patientId);

  const reportsQuery = useAnimalReports(patientId, debouncedSearch);
  const {
    data,
    isPending: reportsPending,
    isError: reportsIsError,
    error: reportsError,
    refetch: refetchReports,
  } = reportsQuery;

  const reports = data?.pages.flatMap((page) => page.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;
  const hasSearch = debouncedSearch.length > 0;

  const handleAddReport = () => {
    navigation.navigate('NovoRelatoAnimal', { patientId });
  };

  if (patientPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalReports.title')} />
        <LoadingState message={t('animalReports.loadingPatient')} />
      </View>
    );
  }

  if (patientIsError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalReports.title')} />
        <ScreenContainer>
          <EmptyState
            tone="error"
            title={t('animalReports.loadErrorTitle')}
            message={describeLoadError(patientError, t('patientDetail.notFound'))}
            actionLabel={t('common.tryAgain')}
            onAction={() => refetchPatient()}
          />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={patient.nome} />
      <ScreenContainer onRefresh={refetchReports}>
        <ArkiveIdField arkivePatientId={patient.arkivePatientId} style={styles.arkiveIdField} />
        <Text accessibilityRole="header" style={[commonStyles.eyebrow, { color: colors.inkSecondary, marginBottom: spacing.sm }]}>
          {t('animalReports.title')}
        </Text>

        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('animalReports.searchPlaceholder')}
        />

        {/* RESPONSAVEL-only — a VETERINARIO viewing this same screen (via the
            consultation eye icon) never sees this button at all, matching
            the backend's own RESPONSAVEL-only create authorization. */}
        {isResponsavel ? (
          <AppButton
            title={t('animalReports.addReportButton')}
            icon="add"
            onPress={handleAddReport}
            style={styles.addButton}
          />
        ) : null}

        {/* Never shown as "no reports" when the list call actually failed —
            this branch is checked BEFORE the empty-state branch below. */}
        {reportsIsError ? (
          <>
            <EmptyState
              tone="error"
              title={t('animalReports.loadErrorTitle')}
              message={describeAnimalReportListError(reportsError)}
              actionLabel={t('common.tryAgain')}
              onAction={() => refetchReports()}
            />
          </>
        ) : reportsPending ? (
          <LoadingState message={t('animalReports.loading')} />
        ) : reports.length === 0 ? (
          <EmptyState
            title={hasSearch ? t('animalReports.emptySearchTitle') : t('animalReports.emptyTitle')}
            message={hasSearch ? t('animalReports.emptySearchMessage') : t('animalReports.emptyMessage')}
          />
        ) : (
          <>
            <Text style={[styles.resultsCount, { color: colors.inkSecondary }]}>
              {totalElements === 1
                ? t('animalReports.resultsCountOne')
                : t('animalReports.resultsCount', { count: totalElements })}
            </Text>
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}

            <LoadMoreButton query={reportsQuery} />
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdField: { marginTop: 0, marginBottom: spacing.md },
  addButton: { marginBottom: spacing.md },
  resultsCount: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  reportCard: { marginBottom: spacing.sm },
  reportedBy: { fontSize: fontSize.sm, ...font('bold') },
  meta: { fontSize: fontSize.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
  text: { fontSize: fontSize.md, marginTop: spacing.sm, lineHeight: fontSize.md * lineHeight.body },
  expandLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderRadius: radius.sm,
  },
});
