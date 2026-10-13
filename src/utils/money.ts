import { t } from '../i18n/store';

/**
 * Parses an optional monetary form field (consultation/prescription cost)
 * into a plain JS number for submission — Java always receives a bare
 * decimal, never a formatted/localized string like "R$ 180,00" (see
 * `formatCurrency` in `localeFormat.ts` for the display-only direction).
 *
 * Empty input is valid and distinct from an invalid one: `{ ok: true, value:
 * null }` means "no cost recorded," which callers send as `undefined`/`null`
 * (Java treats both the same as "clear"). Tolerates a pt-BR comma decimal
 * separator ("180,50") by normalizing it to a dot before validating, but
 * never treats a comma as a thousands separator — none of these amounts
 * need one.
 *
 * Deliberately mirrors only the obvious client-side UX restrictions (no
 * negative, no garbage, no more than 2 decimal places) — it does not attempt
 * to replicate Java's own `@DecimalMin`/`@Digits` validation exactly; the
 * backend remains authoritative.
 */
export type MoneyParseResult = { ok: true; value: number | null } | { ok: false; errorMessage: string };

const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

export function parseMoneyInput(raw: string): MoneyParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const normalized = trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed;

  if (!NUMERIC_PATTERN.test(normalized)) {
    return { ok: false, errorMessage: t('money.errorInvalid') };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, errorMessage: t('money.errorInvalid') };
  }
  if (value < 0) {
    return { ok: false, errorMessage: t('money.errorNegative') };
  }

  const decimalPart = normalized.split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return { ok: false, errorMessage: t('money.errorTooManyDecimals') };
  }

  return { ok: true, value };
}

/**
 * The inverse direction, for hydrating a form field from a persisted value —
 * plain decimal text (never currency-formatted, no "R$", no thousands
 * separator), so feeding it straight back through `parseMoneyInput`
 * round-trips to the exact same number.
 */
export function moneyToInputValue(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}
