import type { Severidade } from '../services/consultaService';
import { t } from '../i18n/store';

const KNOWN: Severidade[] = ['AUSENTE', 'LEVE', 'MODERADA', 'GRAVE'];

/** Renders a confirmed Severidade code as its localized label; falls back to the raw value for anything unrecognized (e.g. AI-suggested text that isn't one of the three confirmed codes). */
export function severidadeLabel(value?: string | null): string {
  if (!value) return t('severidade.notInformed');
  if (!KNOWN.includes(value as Severidade)) return value;
  return t(`severidade.${value as Severidade}`);
}
