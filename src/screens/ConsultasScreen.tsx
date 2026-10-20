import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { DateField } from '../components/DateField';
import { StatusBadge } from '../components/StatusBadge';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultasByStatus } from '../hooks/useConsultas';
import { LoadMoreButton } from '../components/LoadMoreButton';
import type { ConsultaDto, ConsultaListFilters, ConsultaStatus } from '../services/consultaService';
import { CONSULTA_STATUS_ORDER, consultaStatusPresentation } from '../utils/statusPresentation';
import { formatDate, formatTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AppStackParamList } from '../interfaces/navigation';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

const FILTER_DEBOUNCE_MS = 300;

/**
 * V19 — local-calendar-day ISO bounds for `dataHoraInicio`/`dataHoraFim`,
 * built exclusively from local `Date` getters (never `toISOString()`, which
 * is UTC-based and can shift the calendar day). Matches the exact
 * `LocalDateTime` shape `ConsultaController.listar` expects
 * (`yyyy-MM-ddTHH:mm:ss`, no `Z`/offset), same technique already established
 * by `utils/consultaScheduling.ts`'s `toLocalDateTimeString`. A date-only
 * range (no time-of-day picker) is deliberately inclusive of the full
 * calendar day at each end.
 */
function startOfDayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00`;
}

function endOfDayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T23:59:59`;
}

/**
 * Real veterinarian consultation list — GET /api/consultas via TanStack
 * Query, no mock fallback. A failed request renders a real error state; an
 * empty response renders a real empty state.
 *
 * Title row is a normal (non-absolute) flex row — title left, refresh/add
 * icon actions on the right via `HeaderIconButton` — replacing the old
 * bottom-right floating "+" (`commonStyles.fab`) that could sit on top of
 * the last visible card.
 */
export function ConsultasScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // V19 search filters — compact, collapsible panel (see `filtersOpen`
  // below). Text fields are debounced the same 300ms every other search
  // field in this app uses; the date range has no debounce of its own since
  // picking a date is already a single discrete action, not keystrokes.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pacienteNomeInput, setPacienteNomeInput] = useState('');
  const [debouncedPacienteNome, setDebouncedPacienteNome] = useState('');
  const [arkiveIdInput, setArkiveIdInput] = useState('');
  const [debouncedArkiveId, setDebouncedArkiveId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedPacienteNome(pacienteNomeInput.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [pacienteNomeInput]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedArkiveId(arkiveIdInput.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [arkiveIdInput]);

  // Checked both here (to block an invalid range from ever being sent) and
  // via each DateField's own `minimumDate`/`maximumDate` below (to stop the
  // picker from offering an inverted selection in the first place) —
  // defense in depth, never relying on only one of the two.
  const dateRangeError =
    startDate && endDate && startDate.getTime() > endDate.getTime() ? t('consultasList.filterDateRangeError') : null;

  const hasActiveFilters = Boolean(
    debouncedPacienteNome || debouncedArkiveId || startDate || endDate
  );

  const handleClearFilters = () => {
    setPacienteNomeInput('');
    setDebouncedPacienteNome('');
    setArkiveIdInput('');
    setDebouncedArkiveId('');
    setStartDate(null);
    setEndDate(null);
  };

  // A plain object with possibly-`undefined` fields — `JSON.stringify` (what
  // TanStack Query's key hashing uses) drops `undefined`-valued keys, so an
  // all-empty `filters` here hashes identically to the unfiltered `{}` the
  // query key already used before this feature existed. `dateRangeError`
  // being set suppresses BOTH date bounds together (an inverted range is
  // never partially submitted as just a start or just an end).
  const filters: ConsultaListFilters = {
    pacienteNome: debouncedPacienteNome || undefined,
    arkivePatientId: debouncedArkiveId || undefined,
    dataHoraInicio: !dateRangeError && startDate ? startOfDayIso(startDate) : undefined,
    dataHoraFim: !dateRangeError && endDate ? endOfDayIso(endDate) : undefined,
  };

  // Each status group is its own paged query (`?status=`), so grouping stays
  // correct across pages.
  //
  // Rules-of-Hooks fix: `useConsultasByStatus` must never be called inside a
  // `.map()` callback — that calls a hook from within a loop/callback body,
  // which React's Rules of Hooks forbid regardless of whether the array
  // happens to have a stable length. Each status is called individually and
  // unconditionally here instead; `CONSULTA_STATUS_ORDER` (a fixed,
  // compile-time constant — `['AP', 'EP', 'AG', 'FI', 'CA']`, never
  // reordered/resized at runtime) is used only AFTER all five hooks have
  // already run, purely to assemble the results back into the same
  // `{ status, query }[]` shape every other line in this screen already
  // consumes — no downstream grouping/pagination/totals/expand-collapse
  // logic changes at all. `filters` is passed identically to all five —
  // changing it mid-session naturally resets each group to its own page 0
  // via the query-key change, never a manual pagination reset.
  const apQuery = useConsultasByStatus('AP', filters);
  const epQuery = useConsultasByStatus('EP', filters);
  const agQuery = useConsultasByStatus('AG', filters);
  const fiQuery = useConsultasByStatus('FI', filters);
  const caQuery = useConsultasByStatus('CA', filters);
  const queryByStatus: Record<ConsultaStatus, ReturnType<typeof useConsultasByStatus>> = {
    AP: apQuery,
    EP: epQuery,
    AG: agQuery,
    FI: fiQuery,
    CA: caQuery,
  };
  const groups = CONSULTA_STATUS_ORDER.map((status) => ({ status, query: queryByStatus[status] }));

  const isPending = groups.some((group) => group.query.isPending);
  const failed = groups.find((group) => group.query.isError)?.query;
  const isRefetching = groups.some((group) => group.query.isRefetching);
  const refetch = () => groups.forEach((group) => group.query.refetch());
  const visibleGroups = groups
    .map((group) => ({ ...group, consultas: group.query.data?.pages.flatMap((page) => page.content) ?? [] }))
    .filter((group) => group.consultas.length > 0);

  const [collapsed, setCollapsed] = useState<Set<ConsultaStatus>>(new Set());
  const toggleGroup = (status: ConsultaStatus) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const renderCard = (consulta: ConsultaDto) => {
    const dataHora = new Date(consulta.dataHora);
    return (
      <AppCard
        key={consulta.id}
        onPress={() => navigation.navigate('ConsultaDetalhe', { consultaId: consulta.id })}
      >
        <View style={styles.cardRow}>
          <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
            {consulta.animalNome}
          </Text>
          <StatusBadge
            label={consulta.statusDescricao}
            tone={consultaStatusPresentation(consulta.status).tone}
          />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...commonStyles.arkiveId }}>
          {patientArkiveIdLine({ arkivePatientId: consulta.animalArkivePatientId })}
        </Text>
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDate(dataHora)}</Text>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={styles.timeIcon} />
          <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTime(dataHora)}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }} numberOfLines={2}>
          {consulta.motivo}
        </Text>
      </AppCard>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]} numberOfLines={1}>
            {t('consultasList.title')}
          </Text>
          <View style={styles.actionsRow}>
            <HeaderIconButton
              icon={filtersOpen || hasActiveFilters ? 'filter' : 'filter-outline'}
              onPress={() => setFiltersOpen((current) => !current)}
              accessibilityLabel={t('consultasList.filtersAccessibilityLabel')}
            />
            {!isPending && !failed ? (
              <HeaderIconButton
                icon="refresh"
                onPress={refetch}
                disabled={isRefetching}
                loading={isRefetching}
                accessibilityLabel={t('consultasList.refreshAccessibilityLabel')}
              />
            ) : null}
            <HeaderIconButton
              icon="add"
              onPress={() => navigation.navigate('CriarConsulta')}
              accessibilityLabel={t('newConsulta.newConsultaAccessibilityLabel')}
            />
          </View>
        </View>

        {filtersOpen ? (
          <View style={[styles.filtersPanel, { borderColor: colors.border }]}>
            <AppInput
              label={t('consultasList.filterPatientNameLabel')}
              placeholder={t('consultasList.filterPatientNamePlaceholder')}
              value={pacienteNomeInput}
              onChangeText={setPacienteNomeInput}
            />
            <AppInput
              label={t('consultasList.filterArkiveIdLabel')}
              placeholder={t('consultasList.filterArkiveIdPlaceholder')}
              value={arkiveIdInput}
              onChangeText={setArkiveIdInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeField}>
                <DateField
                  label={t('consultasList.filterStartDateLabel')}
                  value={startDate}
                  onChange={setStartDate}
                  maximumDate={endDate ?? undefined}
                  onClear={() => setStartDate(null)}
                />
              </View>
              <View style={styles.dateRangeField}>
                <DateField
                  label={t('consultasList.filterEndDateLabel')}
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={startDate ?? undefined}
                  onClear={() => setEndDate(null)}
                />
              </View>
            </View>
            {dateRangeError ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>{dateRangeError}</Text>
            ) : null}
            {hasActiveFilters ? (
              <AppButton
                title={t('consultasList.clearFiltersButton')}
                variant="ghost"
                onPress={handleClearFilters}
              />
            ) : null}
          </View>
        ) : null}

        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('consultasList.loading')}
          </Text>
        ) : failed ? (
          <EmptyState
            title={t('consultasList.loadErrorTitle')}
            message={failed.error instanceof Error ? failed.error.message : t('consultasList.genericServerError')}
          />
        ) : visibleGroups.length > 0 ? (
          visibleGroups.map((group) => (
            <View key={group.status}>
              <Pressable
                onPress={() => toggleGroup(group.status)}
                style={styles.groupHeader}
                accessibilityRole="button"
                accessibilityState={{ expanded: !collapsed.has(group.status) }}
              >
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                  {consultaStatusPresentation(group.status).label} ({group.query.data?.pages[0]?.totalElements ?? 0})
                </Text>
                <Ionicons
                  name={collapsed.has(group.status) ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
              {collapsed.has(group.status) ? null : (
                <>
                  {group.consultas.map(renderCard)}
                  <LoadMoreButton query={group.query} />
                </>
              )}
            </View>
          ))
        ) : (
          <EmptyState title={t('consultasList.emptyTitle')} message={t('consultasList.emptyMessage')} />
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pageTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  actionsRow: { flexDirection: 'row' },
  filtersPanel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  dateRangeRow: { flexDirection: 'row', gap: spacing.sm },
  dateRangeField: { flex: 1 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  groupTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.xs },
  dateTimeText: { fontSize: fontSize.sm, fontWeight: '700', marginLeft: spacing.xs },
  timeIcon: { marginLeft: spacing.md },
});
