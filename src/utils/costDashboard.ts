import { getLanguage } from '../i18n/store';

/**
 * Pure aggregations behind the cost dashboards (`VeterinarianCostScreen`,
 * `PatientCostScreen`). Both endpoints return every FI consultation at once,
 * so filtering by period and bucketing happen here, client-side.
 */
export type CostPeriod = '30d' | '6m' | '12m' | 'all';
export const COST_PERIODS: CostPeriod[] = ['30d', '6m', '12m', 'all'];

/** The fields both cost responses share. Null values count as 0. */
export interface CostRow {
  dataHora: string;
  valorConsulta: number | null;
  valorMedicamentos: number | null;
  valorTotal: number;
}

export interface CostBucket {
  label: string;
  accessibilityLabel: string;
  consulta: number;
  medicamentos: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** `[start, end)` of the period; `offset = 1` is the period right before it. `null` for 'all'. */
export function periodRange(period: CostPeriod, now: Date, offset = 0): { start: Date; end: Date } | null {
  if (period === 'all') return null;
  if (period === '30d') {
    const end = new Date(now.getTime() + 1 - offset * 30 * DAY_MS);
    return { start: new Date(end.getTime() - 30 * DAY_MS), end };
  }
  const months = period === '6m' ? 6 : 12;
  const currentStart = addMonths(now, -(months - 1));
  const start = addMonths(currentStart, -offset * months);
  const end = offset === 0 ? new Date(now.getTime() + 1) : addMonths(start, months);
  return { start, end };
}

function inRange(row: CostRow, range: { start: Date; end: Date }): boolean {
  const time = new Date(row.dataHora).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export function filterByPeriod<T extends CostRow>(rows: T[], period: CostPeriod, now: Date): T[] {
  const range = periodRange(period, now);
  return range ? rows.filter((row) => inRange(row, range)) : rows;
}

export function sumTotal(rows: CostRow[]): number {
  return rows.reduce((sum, row) => sum + row.valorTotal, 0);
}

export function sumConsulta(rows: CostRow[]): number {
  return rows.reduce((sum, row) => sum + (row.valorConsulta ?? 0), 0);
}

export function sumMedicamentos(rows: CostRow[]): number {
  return rows.reduce((sum, row) => sum + (row.valorMedicamentos ?? 0), 0);
}

/** Rows of the same-length period right before this one; `null` for 'all'. */
export function previousPeriodRows<T extends CostRow>(rows: T[], period: CostPeriod, now: Date): T[] | null {
  const range = periodRange(period, now, 1);
  return range ? rows.filter((row) => inRange(row, range)) : null;
}

/** "12/09 a 11/10" (30d) or "mai/25 a out/25" (months) for the previous period; `null` for 'all'. */
export function previousRangeLabel(period: CostPeriod, now: Date): string | null {
  const range = periodRange(period, now, 1);
  if (!range) return null;
  const last = new Date(range.end.getTime() - 1);
  const format = (date: Date) =>
    period === '30d'
      ? dayMonthLabel(date)
      : `${monthLabel(date, false)}/${String(date.getFullYear()).slice(2)}`;
  return `${format(range.start)} – ${format(last)}`;
}

/** Percent change, or `null` when there is nothing to compare against. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function ticketMedio(rows: CostRow[]): number {
  return rows.length === 0 ? 0 : sumTotal(rows) / rows.length;
}

function monthLabel(date: Date, withYear: boolean): string {
  return new Intl.DateTimeFormat(getLanguage(), withYear ? { month: 'short', year: 'numeric' } : { month: 'short' })
    .format(date)
    .replace('.', '');
}

function dayMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(getLanguage(), { day: '2-digit', month: '2-digit' }).format(date);
}

/**
 * Chart buckets for the period, empty ones included:
 * - 30d: one per day;
 * - 6m/12m: one per month;
 * - all: one per month from the first row, or one per year past 12 months.
 * `offset = 1` buckets the period right before (same bucket count, so the two
 * line up index by index); 'all' has no previous period and returns [].
 */
export function bucketByPeriod(rows: CostRow[], period: CostPeriod, now: Date, offset = 0): CostBucket[] {
  if (period === 'all' && offset > 0) return [];
  const range = periodRange(period, now, offset);
  const filtered = range ? rows.filter((row) => inRange(row, range)) : rows;
  // Last instant inside the period: `now` for the current one, the day before
  // the next period starts for an earlier one.
  const last = range && offset > 0 ? new Date(range.end.getTime() - 1) : now;
  const fill = (buckets: CostBucket[], indexOf: (date: Date) => number) => {
    for (const row of filtered) {
      const bucket = buckets[indexOf(new Date(row.dataHora))];
      if (!bucket) continue;
      bucket.consulta += row.valorConsulta ?? 0;
      bucket.medicamentos += row.valorMedicamentos ?? 0;
    }
    return buckets;
  };
  const empty = (label: string, accessibilityLabel: string): CostBucket => ({
    label,
    accessibilityLabel,
    consulta: 0,
    medicamentos: 0,
  });

  if (period === '30d') {
    const start = range!.start.getTime();
    const buckets = Array.from({ length: RECENT_DAYS }, (_, i) => {
      const day = new Date(start + i * DAY_MS);
      return empty(dayMonthLabel(day), dayMonthLabel(day));
    });
    return fill(buckets, (date) => Math.floor((date.getTime() - start) / DAY_MS));
  }

  let firstMonth: Date;
  if (period === 'all') {
    if (filtered.length === 0) return [];
    const earliest = Math.min(...filtered.map((row) => new Date(row.dataHora).getTime()));
    firstMonth = addMonths(new Date(earliest), 0);
  } else {
    firstMonth = range!.start;
  }
  const monthIndex = (date: Date) =>
    (date.getFullYear() - firstMonth.getFullYear()) * 12 + date.getMonth() - firstMonth.getMonth();
  const monthCount = monthIndex(last) + 1;

  if (monthCount > 12) {
    const firstYear = firstMonth.getFullYear();
    const buckets = Array.from({ length: last.getFullYear() - firstYear + 1 }, (_, i) =>
      empty(String(firstYear + i), String(firstYear + i))
    );
    return fill(buckets, (date) => date.getFullYear() - firstYear);
  }

  const buckets = Array.from({ length: monthCount }, (_, i) => {
    const month = addMonths(firstMonth, i);
    return empty(monthLabel(month, false), monthLabel(month, true));
  });
  return fill(buckets, monthIndex);
}

export interface AnimalTotal {
  animalId: number;
  animalNome: string;
  total: number;
  count: number;
}

/** Per-patient totals and consultation counts, highest total first. */
export function topByAnimal(
  rows: (CostRow & { animalId: number; animalNome: string })[],
  limit?: number
): AnimalTotal[] {
  const totals = new Map<number, AnimalTotal>();
  for (const row of rows) {
    const current = totals.get(row.animalId) ?? {
      animalId: row.animalId,
      animalNome: row.animalNome,
      total: 0,
      count: 0,
    };
    current.total += row.valorTotal;
    current.count += 1;
    totals.set(row.animalId, current);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}
