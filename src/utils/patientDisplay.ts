import { t } from '../i18n/store';
import { formatAge } from './localeFormat';
import type { AnimalDto } from '../services/patientService';

/**
 * "Espécie · Raça · Sexo · Idade" — the secondary line every patient
 * selector/card uses so two same-name, same-species, same-breed animals
 * (a legitimate, allowed case — see PatientForm's dropped duplicate-name
 * warning) still read as distinct at a glance, without requiring a
 * per-card responsible-person fetch (see `patientArkiveIdLine`'s own note on
 * why that name is deliberately NOT part of this line).
 */
export function patientSummaryLine(animal: AnimalDto): string {
  const parts = [animal.especieNome];
  if (animal.racaNome) parts.push(animal.racaNome);
  if (animal.sexo === 'M') parts.push(t('common.male'));
  else if (animal.sexo === 'F') parts.push(t('common.female'));
  if (animal.dataNascimento) parts.push(formatAge(animal.dataNascimento));
  return parts.join(' · ');
}

/**
 * The permanent, product-facing patient identity line — `ARK-PET-XXXXX-...`
 * shown alongside the name on cards, selectors, and detail headers. The
 * numeric database id (`animal.id`) remains valid internally for
 * navigation/query-keys/API calls, but is NEVER displayed as the patient's
 * identity (no more "Paciente #184") — if the ArkIve id is unexpectedly
 * missing, this falls back to a neutral message that does NOT expose the
 * database id either.
 *
 * Deliberately does NOT include the responsible person's name the way a
 * single patient's detail screen can: showing "Responsável: X" on every row
 * of a patient list would mean firing one
 * `GET /api/animais-responsaveis/animal/{id}` per visible card (no bulk
 * endpoint exists, and inventing N+1 fetches for a potentially long list
 * isn't a reasonable trade for a cosmetic line) — `PatientDetailScreen`,
 * which already pays for exactly one such fetch for the single patient being
 * viewed, is where the real responsible-person name is shown.
 *
 * This is the ONE shared helper for this identity line — every card/
 * selector/header displaying a patient's ArkIve id goes through this rather
 * than formatting `arkivePatientId` inline.
 */
export function patientArkiveIdLine(animal: Pick<AnimalDto, 'arkivePatientId'>): string {
  return animal.arkivePatientId ?? t('patientDisplay.arkiveIdMissing');
}

/** Up to two initials of a person's name, for the identity mark (sidebar, profile). */
export function nameInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
