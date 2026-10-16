import type { AccessRequestStatus } from '../services/patientAccessRequestService';
import type { StatusPresentation } from './statusPresentation';
import { t } from '../i18n/store';

/** Visual tone for `StatusBadge`, mirroring `consultaStatusPresentation`'s own pattern. Never invents a fourth status — `PatientAccessRequestStatus.java` has exactly these three values. */
export function accessRequestStatusPresentation(status: AccessRequestStatus): StatusPresentation {
  switch (status) {
    case 'PENDING':
      return { label: t('accessRequestStatus.PENDING'), tone: 'warning' };
    case 'APPROVED':
      return { label: t('accessRequestStatus.APPROVED'), tone: 'success' };
    case 'REJECTED':
      return { label: t('accessRequestStatus.REJECTED'), tone: 'danger' };
  }
}
