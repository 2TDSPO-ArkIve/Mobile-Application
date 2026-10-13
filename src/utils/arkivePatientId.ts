/**
 * `ARK-PET-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX` — confirmed exact shape from
 * `ArkivePatientIdGenerator.generate()` (sibling Java repo): `"ARK-PET-"` +
 * four 5-character groups + one final 6-character group, using a
 * Crockford-like base32 alphabet (digits 2-9, uppercase letters excluding
 * 0/1/I/O to avoid visual ambiguity).
 *
 * The backend's own endpoint binds this as a plain, unvalidated
 * `@PathVariable String` (`AnimalController.buscarPorArkivePatientId` has no
 * `@Pattern`/format constraint) — a strict client-side regex matching
 * today's exact segment shape could reject a technically-different-but-
 * still-valid id if the generator ever changes. This app therefore only
 * checks the one STABLE, product-facing signal — the `"ARK-PET-"` prefix
 * plus non-emptiness beyond it — not the precise character set or segment
 * lengths. Real existence/validity is Java's call alone (404 vs. 200).
 *
 * Security note: this id is a permanent, non-secret, display-only patient
 * identifier — never an authorization mechanism. Knowing it only lets a
 * caller ASK the backend for that patient; `ClinicalAccessService.exigirLeituraAnimal`
 * (the same read-authorization rule every other patient read goes through)
 * decides whether the request is actually allowed. This is an entirely
 * different concept from a patient-sharing invitation token/code, which IS a
 * temporary authorization mechanism — never conflate the two, and never
 * store this id in SecureStore as if it were a credential (normal TanStack
 * Query caching of the returned patient data is fine, same as any other
 * patient read).
 */
const ARKIVE_ID_PREFIX = 'ARK-PET-';

/** Trim + uppercase only — never invents, removes, or "fixes" characters into a different potentially-valid id. */
export function normalizeArkivePatientId(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Broad shape check only (prefix + non-empty remainder) — deliberately not a
 * full format validator. Exists purely to avoid sending an obviously
 * meaningless request (empty input, or text with no relation to an ArkIve
 * id at all); a value that passes this can still be a 404 server-side.
 */
export function isPlausibleArkivePatientId(normalized: string): boolean {
  return normalized.startsWith(ARKIVE_ID_PREFIX) && normalized.length > ARKIVE_ID_PREFIX.length;
}
