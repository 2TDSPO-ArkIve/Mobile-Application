import { onlyDigits } from './validation';

/**
 * Every function here mirrors `ResponsavelRegistrationService
 * .normalizarEValidarCpf`/`digitosCpfValidos`/`calcularDigitoCpf` in the
 * sibling Java repo EXACTLY — same normalization, same rejection rules, same
 * check-digit algorithm — so a CPF this app accepts is guaranteed to also
 * pass the backend's own validation, and vice versa.
 */

/** Digits only, capped at 11 — the exact normalized form Java persists and expects on submission (never the visual mask). */
export function normalizeCpf(raw: string): string {
  return onlyDigits(raw).slice(0, 11);
}

/**
 * `000.000.000-00` — derived FRESH from the normalized digits on every call,
 * never hand-edited in place. This is what makes deletion/paste "just work"
 * on both native and web: the caller always feeds the latest raw text in,
 * and gets the correctly-punctuated mask back, regardless of where the
 * cursor was or what was deleted.
 */
export function formatCpfInput(raw: string): string {
  const digits = normalizeCpf(raw);
  let result = digits.slice(0, 3);
  if (digits.length > 3) result += `.${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `.${digits.slice(6, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  return result;
}

function cpfCheckDigit(digits: string, quantity: number, firstWeight: number): number {
  let sum = 0;
  for (let i = 0; i < quantity; i++) {
    sum += Number(digits[i]) * (firstWeight - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** `normalized` must already be exactly 11 digits (see `normalizeCpf`) — rejects all-identical-digit sequences and validates both check digits, identically to the backend. */
export function isValidCpf(normalized: string): boolean {
  if (!/^\d{11}$/.test(normalized)) return false;
  if (new Set(normalized).size === 1) return false;
  const firstCheck = cpfCheckDigit(normalized, 9, 10);
  const secondCheck = cpfCheckDigit(normalized, 10, 11);
  return firstCheck === Number(normalized[9]) && secondCheck === Number(normalized[10]);
}

/**
 * A mathematically-valid CPF for use as a TEST EXAMPLE only.
 *
 * IMPORTANT: this is NOT a verified-unassigned synthetic identity. A
 * randomly generated, check-digit-valid CPF could coincidentally match a
 * real person's actual number — there is no way to confirm non-assignment
 * without an external registry this app deliberately does not call. Never
 * present a generated value as "officially fictitious", "unregistered", or
 * "guaranteed synthetic" — it is a structurally-valid test example, nothing
 * more.
 */
export function generateTestCpf(): string {
  for (;;) {
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    if (new Set(base).size === 1) continue;
    const firstCheck = cpfCheckDigit(base, 9, 10);
    const withFirst = base + firstCheck;
    const secondCheck = cpfCheckDigit(withFirst, 10, 11);
    const candidate = withFirst + secondCheck;
    if (isValidCpf(candidate)) return candidate;
  }
}
