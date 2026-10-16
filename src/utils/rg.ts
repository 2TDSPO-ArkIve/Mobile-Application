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
 * A clearly test-format alphanumeric identifier compatible with Java's
 * structural validation (`[A-Z0-9]{5,14}`) — labeled as a TEST EXAMPLE, not
 * a verified synthetic identity, and not meant to resemble any real state's
 * actual RG issuing format.
 */
export function generateTestRg(): string {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `TST${digits}`;
}
