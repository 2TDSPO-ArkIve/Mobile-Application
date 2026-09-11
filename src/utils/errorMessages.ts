import { ApiError, isNetworkError } from '../services/apiClient';
import { RecordingFileError } from '../services/transcricaoService';
import { InvalidPdfError } from '../services/consultaPdfService';
import { t } from '../i18n/store';

/** Translates a save-narrative failure into veterinarian-facing language — never the raw HTTP/API detail. */
export function describeNarrativeSaveError(error: unknown): string {
  if (isNetworkError(error)) {
    return t('errors.narrativeSaveNetwork');
  }
  return t('errors.narrativeSaveGeneric');
}

/** Translates a clinical-support request failure into veterinarian-facing language. */
export function describeClinicalSupportError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.clinicalSupportForbidden');
    }
    if (error.status === 409) {
      return t('errors.clinicalSupportConflict');
    }
    if (error.status >= 500) {
      return t('errors.clinicalSupportUnavailable');
    }
    return t('errors.clinicalSupportGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.clinicalSupportNetwork');
  }
  return t('errors.clinicalSupportGeneric');
}

/** Translates a finalization failure into veterinarian-facing language. */
export function describeFinalizeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return t('errors.finalizeValidation');
    }
    if (error.status === 403) {
      return t('errors.finalizeForbidden');
    }
    if (error.status === 404) {
      return t('errors.finalizeNotFound');
    }
    if (error.status === 409) {
      return t('errors.finalizeConflict');
    }
    if (error.status >= 500) {
      return t('errors.finalizeUnavailable');
    }
    return t('errors.finalizeGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.finalizeNetwork');
  }
  return t('errors.finalizeGeneric');
}

/**
 * Translates a prescription create/update/delete failure. The 409 case is
 * confirmed to mean one specific thing server-side
 * (`PrescricaoService.exigirSemAdesaoRegistrada`): the prescription already
 * has an adherence record and can no longer be changed or removed.
 */
export function describePrescricaoError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return t('errors.prescricaoValidation');
    }
    if (error.status === 403) {
      return t('errors.prescricaoForbidden');
    }
    if (error.status === 404) {
      return t('errors.prescricaoNotFound');
    }
    if (error.status === 409) {
      return t('errors.prescricaoConflict');
    }
    if (error.status >= 500) {
      return t('errors.prescricaoUnavailable');
    }
    return t('errors.prescricaoGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.prescricaoNetwork');
  }
  return t('errors.prescricaoGeneric');
}

/**
 * Translates a patient create/update failure. The 403 case is confirmed to
 * mean one specific thing for a VETERINARIO caller
 * (`AnimalService.clinicaVeterinarioAutenticado`): the authenticated vet has
 * no clinic linked, so the backend can't derive one to attach the patient to.
 */
export function describePatientError(error: unknown, isUpdate = false): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return t('errors.patientValidation');
    }
    if (error.status === 403) {
      return t('errors.patientForbidden');
    }
    if (error.status === 404) {
      return t('errors.patientNotFound');
    }
    if (error.status === 409) {
      return t('errors.patientConflict');
    }
    if (error.status >= 500) {
      return isUpdate ? t('errors.patientUpdateUnavailable') : t('errors.patientCreateUnavailable');
    }
    return isUpdate ? t('errors.patientUpdateGeneric') : t('errors.patientCreateGeneric');
  }
  if (isNetworkError(error)) {
    return isUpdate ? t('errors.patientUpdateNetwork') : t('errors.patientCreateNetwork');
  }
  return isUpdate ? t('errors.patientUpdateGeneric') : t('errors.patientCreateGeneric');
}

/**
 * Translates a POST /api/transcricoes failure. Status codes confirmed
 * against `TranscricaoService.java`: 400 (missing/unreadable/unsupported
 * audio), 413 (`AzureSpeechProperties.maxUploadSize`, 10MB default), 422
 * (Azure returned no speech), 401 handled globally. 403/429/502/503 are the
 * product's own mapped language for the remaining documented cases.
 */
export function describeTranscriptionError(error: unknown): string {
  if (error instanceof RecordingFileError) {
    return t('errors.transcriptionFileMissing');
  }
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return t('errors.transcriptionBadAudio');
    }
    if (error.status === 403) {
      return t('errors.transcriptionForbidden');
    }
    if (error.status === 413) {
      return t('errors.transcriptionTooLarge');
    }
    if (error.status === 422) {
      return t('errors.transcriptionNoSpeech');
    }
    if (error.status === 429) {
      return t('errors.transcriptionBusy');
    }
    if (error.status === 502 || error.status === 503 || error.status >= 500) {
      return t('errors.transcriptionUnavailable');
    }
    return t('errors.transcriptionGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.transcriptionNetwork');
  }
  return t('errors.transcriptionGeneric');
}

/**
 * Translates a `GET /api/consultas/{id}/resumo-pdf` failure. 403 (no
 * permission) and 409 (consultation not FI yet) are confirmed backend
 * outcomes; network/5xx is a simple "try again" — this endpoint is a plain
 * read/export action, never worth an automatic retry loop.
 */
export function describeConsultaPdfError(error: unknown): string {
  if (error instanceof InvalidPdfError) {
    return t('errors.pdfInvalid');
  }
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.pdfForbidden');
    }
    if (error.status === 409) {
      return t('errors.pdfNotFinalized');
    }
    return t('errors.pdfUnavailable');
  }
  return t('errors.pdfUnavailable');
}

/**
 * Translates a `POST /api/auth/change-password` failure. Confirmed against
 * `PasswordLifecycleService`/`PasswordPolicy.java`: a policy violation (too
 * short, missing uppercase/lowercase/digit, confirmation mismatch) throws a
 * `BusinessException` — HTTP 400 with an already specific, human-readable
 * message (e.g. "A senha deve conter pelo menos uma letra maiuscula.") —
 * shown verbatim rather than replaced with a generic one, since it's
 * genuinely actionable. A 401 here means the currently-stored (old/temporary)
 * Basic Auth credential itself was rejected — this endpoint has no separate
 * "current password" field, so that's an auth problem, not a form field.
 */
export function describeChangePasswordError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return error.message || t('errors.passwordPolicyGeneric');
    }
    if (error.status === 401) {
      return t('errors.passwordChangeInvalidCurrent');
    }
    if (error.status >= 500) {
      return t('errors.passwordChangeUnavailable');
    }
    return t('errors.passwordChangeGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.passwordChangeNetwork');
  }
  return t('errors.passwordChangeGeneric');
}

/**
 * Translates a `POST /api/auth/register` failure. Confirmed against
 * `VeterinarioService.criar`/`AuthService.registrarVeterinario`: a duplicate
 * CRMV is a 409 ("CRMV ja cadastrado."), a duplicate e-mail/login is a 400
 * ("Login de usuario ja cadastrado."), and Bean Validation failures are also
 * 400 with a field-by-field message — all already specific and
 * human-readable, so they're shown verbatim rather than replaced with a
 * generic one, same reasoning as `describeChangePasswordError`.
 */
export function describeRegistrationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 409) {
      return error.message || t('errors.registrationGeneric');
    }
    if (error.status >= 500) {
      return t('errors.registrationUnavailable');
    }
    return t('errors.registrationGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.registrationNetwork');
  }
  return t('errors.registrationGeneric');
}
