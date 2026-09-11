import type { ConsultaStatus } from '../services/consultaService';
import { t } from '../i18n/store';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

const CONSULTA_STATUS_TONE: Record<ConsultaStatus, StatusTone> = {
  AG: 'neutral',
  EP: 'info',
  AP: 'warning',
  FI: 'success',
  CA: 'danger',
};

/**
 * Reads the CURRENT language at call time (not reactive on its own) — every
 * caller renders from a component that also calls `useTranslation()` (even
 * indirectly, via its own screen), so it already re-renders when the
 * language changes, which re-evaluates this alongside it.
 */
export function consultaStatusPresentation(status: ConsultaStatus): StatusPresentation {
  return { label: t(`consultaStatus.${status}`), tone: CONSULTA_STATUS_TONE[status] };
}
