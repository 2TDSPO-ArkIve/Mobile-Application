import { onlyDigits } from './validation';

/**
 * `(11) 99999-9999` for an 11-digit mobile number, `(11) 3333-4444` for a
 * 10-digit landline — the split point between the local-number halves is the
 * only thing that depends on total digit count; everything else (area code
 * in parentheses, hyphen before the last 4 digits) is identical either way.
 *
 * `Responsavel.telefone` (`ResponsavelRegistrationService.vazioParaNulo`)
 * only trims the incoming value — Java does NOT strip punctuation itself —
 * so this app sends the FORMATTED display string (trimmed), not bare digits,
 * matching the documented example payload exactly
 * (`"telefone": "(11) 99999-9999"`). Contrast with CPF/RG, where Java DOES
 * normalize server-side and this app sends the normalized value instead.
 */

/** Digits only, capped at 11 (2-digit area code + up to 9-digit local number). */
export function normalizePhoneDigits(raw: string): string {
  return onlyDigits(raw).slice(0, 11);
}

export function formatPhoneInput(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return '';
  const areaCode = digits.slice(0, 2);
  if (digits.length <= 2) return `(${areaCode}`;

  const local = digits.slice(2);
  const isMobile = digits.length > 10; // an 11th digit present means a 9-digit mobile local number
  const splitAt = isMobile ? 5 : 4;
  const firstHalf = local.slice(0, splitAt);
  const secondHalf = local.slice(splitAt);

  return secondHalf ? `(${areaCode}) ${firstHalf}-${secondHalf}` : `(${areaCode}) ${firstHalf}`;
}
