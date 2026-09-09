import { t } from '../i18n/store';
import { formatAge } from './localeFormat';
import type { AnimalDto } from '../services/patientService';

/**
 * "Espécie · Raça · Sexo · Idade" — the secondary line every patient
 * selector/card uses so two same-name, same-species, same-breed animals
 * (a legitimate, allowed case — see PatientForm's dropped duplicate-name
 * warning) still read as distinct at a glance, without requiring a
 * per-card tutor fetch (see `patientTertiaryLine`'s own note on why tutor
 * is deliberately NOT part of this line).
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
 * "Paciente #184" — the last-resort fallback identifier for list/selector
 * cards. Deliberately does NOT include the tutor's name the way a single
 * patient's detail screen can: showing "Tutor: X" on every row of a patient
 * list would mean firing one `GET /api/animais-responsaveis/animal/{id}` per
 * visible card (no bulk endpoint exists, and inventing N+1 fetches for a
 * potentially long list isn't a reasonable trade for a cosmetic line) —
 * `PatientDetailScreen`, which already pays for exactly one such fetch for
 * the single patient being viewed, is where the real tutor name is shown.
 *
 * Never renders a bare/unlabeled `#184` — the label makes clear at a glance
 * that this is a stable record identifier, not a room number or a typo.
 */
export function patientFallbackId(animal: Pick<AnimalDto, 'id'>): string {
  return t('patientDisplay.fallbackId', { id: animal.id });
}
