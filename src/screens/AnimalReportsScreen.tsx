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
import { describeAnimalReportListError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { toDisplayDate } from '../utils/isoDate';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AnimalReportDto } from '../services/animalReportService';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

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
      <Text style={[styles.reportedBy, { color: colors.text }]}>
        {t('animalReports.reportedByLabel', { name: report.responsavelNome })}
      </Text>
      {hasValidCreatedAt ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('animalReports.submittedAtLabel', { date: formatDateTime(createdAt) })}
        </Text>
      ) : null}
      {/* Deliberately a separate line from `submittedAtLabel` — the moment the
          Responsible typed/saved this report is never the same thing as when
          the reported event actually happened. */}
      {report.dataOcorrencia ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('animalReports.occurredAtLabel', { date: toDisplayDate(report.dataOcorrencia) })}
        </Text>
      ) : null}
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={expanded ? undefined : 4}>
        {report.texto}
      </Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button" style={styles.expandLink}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSize.sm }}>
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
  const [loadMoreError, setLoadMoreError] = useState('');

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

  const {
    data,
    isPending: reportsPending,
    isError: reportsIsError,
    error: reportsError,
    refetch: refetchReports,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAnimalReports(patientId, debouncedSearch);

  const reports = data?.pages.flatMap((page) => page.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;
  const hasSearch = debouncedSearch.length > 0;

  const handleLoadMore = async () => {
    setLoadMoreError('');
    try {
      await fetchNextPage();
    } catch {
      setLoadMoreError(t('animalReports.loadMoreError'));
    }
  };

  const handleAddReport = () => {
    navigation.navigate('NovoRelatoAnimal', { patientId });
  };

  if (patientPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalReports.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('animalReports.loadingPatient')}
        </Text>
      </View>
    );
  }

  if (patientIsError || !patient) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('animalReports.title')} />
        <ScreenContainer>
          <EmptyState
            title={t('animalReports.loadErrorTitle')}
            message={patientError instanceof Error ? patientError.message : t('patientDetail.notFound')}
          />
          <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetchPatient()} />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={patient.nome} />
      <ScreenContainer>
        <Text style={[styles.arkiveIdSubtitle, { color: colors.textSecondary }]} selectable>
          {patientArkiveIdLine(patient)}
        </Text>
        <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.sm }]}>
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
              title={t('animalReports.loadErrorTitle')}
              message={describeAnimalReportListError(reportsError)}
            />
            <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetchReports()} />
          </>
        ) : reportsPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }}>
            {t('animalReports.loading')}
          </Text>
        ) : reports.length === 0 ? (
          <EmptyState
            title={hasSearch ? t('animalReports.emptySearchTitle') : t('animalReports.emptyTitle')}
            message={hasSearch ? t('animalReports.emptySearchMessage') : t('animalReports.emptyMessage')}
          />
        ) : (
          <>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {t('animalReports.resultsCount', { count: totalElements })}
            </Text>
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}

            {loadMoreError ? (
              <Text style={{ color: colors.error, marginBottom: spacing.sm }}>{loadMoreError}</Text>
            ) : null}
            {hasNextPage ? (
              <AppButton
                title={isFetchingNextPage ? t('animalReports.loadingMore') : t('animalReports.loadMoreButton')}
                variant="outline"
                onPress={handleLoadMore}
                loading={isFetchingNextPage}
                disabled={isFetchingNextPage}
              />
            ) : null}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arkiveIdSubtitle: { fontSize: fontSize.xs, fontFamily: 'monospace', textAlign: 'center', marginBottom: spacing.sm },
  addButton: { marginBottom: spacing.md },
  resultsCount: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  reportCard: { marginBottom: spacing.sm },
  reportedBy: { fontSize: fontSize.sm, fontWeight: '700' },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
  text: { fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 20 },
  expandLink: { marginTop: spacing.xs, paddingVertical: spacing.xs },
});
