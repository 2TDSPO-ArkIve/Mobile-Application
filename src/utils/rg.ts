/**
 * RG has no universally valid Brazilian mask or check-digit algorithm —
 * confirmed in `ResponsavelRegistrationService.normalizarEValidarRg`: Java
 * accepts a generic normalized alphanumeric value, 5–14 characters
 * (`[A-Z0-9]{5,14}`), after uppercasing and stripping only `.`/`-`/
 * whitespace. This app deliberately mirrors exactly that — a flexible
 * formatter, never a fabricated nationwide checksum or a strict mask that
 * could reject a legitimate RG Java would otherwise accept.
 */

/** Uppercase, strip only dots/hyphens/whitespace (never other characters) — matches Java's own normalization exactly, so a value this app accepts is guaranteed to also pass the backend. */
export function normalizeRg(raw: string): string {
  return raw.trim().toUpperCase().replace(/[.\-\s]/g, '');
}

/** Same shape Java validates against — `[A-Z0-9]{5,14}`. */
export function isValidRg(normalized: string): boolean {
  return /^[A-Z0-9]{5,14}$/.test(normalized);
}

/**
 * Light live-formatting only (uppercase, and drop characters that could
 * never be part of a valid RG even before normalization) — deliberately NOT
 * a fixed mask: RG formats vary legitimately by issuing state, so forcing
 * e.g. `12.345.678-X` as a hard mask would reject other real, backend-valid
 * identifiers. The conventional format is shown only as placeholder text.
 */
export function formatRgInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9.\-\s]/g, '').slice(0, 20);
}

/**
 * A random test RG in the São Paulo layout the placeholder shows
 * (`12.345.678-X`): eight digits plus SSP-SP's mod-11 check digit (weights
 * 2–9, digit = 11 − remainder; 10 is `X`, 11 is `0`). Normalized, it is 9 characters, so it also
 * passes Java's `[A-Z0-9]{5,14}`.
 */
export function generateTestRg(): string {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  const check = (11 - (digits.reduce((sum, digit, i) => sum + digit * (i + 2), 0) % 11)) % 11;
  const d = digits.join('');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}-${check === 10 ? 'X' : check}`;
}
