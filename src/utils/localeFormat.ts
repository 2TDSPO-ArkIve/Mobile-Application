import { getLanguage, t } from '../i18n/store';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Display-only formatting — fixed `dd-MM-yyyy` (and `HH:mm` for time),
 * deliberately NOT locale-dependent (the product's date display format is a
 * single explicit requirement, not something that should flip with the
 * pt-BR/en-US UI language toggle). Never used for anything sent back to the
 * backend (which always gets an explicit ISO/`LocalDateTime` string built
 * separately — `toISODateString`/`toLocalDateTimeString`, untouched by this
 * file). This is the ONE place that owns this formatting; every screen
 * displaying a date/time goes through `formatDate`/`formatTime`/
 * `formatDateTime` here (or `toDisplayDate` in `utils/isoDate.ts` for a
 * date-only ISO string) rather than calling `toLocaleDateString`/
 * `Intl.DateTimeFormat` itself.
 */
export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Display-only BRL currency formatting (`R$ 180,00` pt-BR / `R$180.00`
 * en-US, via `Intl.NumberFormat`) — ArkIve currently only records
 * Brazilian patient-care costs, so the currency itself is fixed regardless
 * of UI language; only the number formatting follows the current locale.
 * NEVER send this formatted string to Java — only the raw number
 * (`parseMoneyInput` in `utils/money.ts` owns that direction).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(getLanguage(), { style: 'currency', currency: 'BRL' }).format(value);
}

/** `YYYY-MM-DD` -> local `Date` at midnight — never via `new Date(iso)`, which parses a bare date as UTC and can shift a day off in a negative-UTC-offset timezone. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local `Date` -> `YYYY-MM-DD` — the exact format `AnimalRequest.dataNascimento` expects, no time/timezone component. */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Display-only age computed from `dataNascimento` — never persisted or sent
 * back to the backend. Whole years once the animal is 1+ year old; whole
 * months (or "less than 1 month") for anything younger, since "0 anos"
 * would be uninformative for a young puppy/kitten.
 */
export function formatAge(dataNascimentoIso: string): string {
  const birth = parseISODate(dataNascimentoIso);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years >= 1) {
    return years === 1 ? t('patientAge.oneYear') : t('patientAge.years', { count: years });
  }
  if (months >= 1) {
    return months === 1 ? t('patientAge.oneMonth') : t('patientAge.months', { count: months });
  }
  return t('patientAge.lessThanMonth');
}
