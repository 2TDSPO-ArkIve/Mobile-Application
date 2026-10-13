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

/** Translates a `GET /api/animais/{id}/historico` failure — a plain authenticated/authorized read, no transient-retry nuance to classify beyond network vs. generic. */
export function describePatientHistoryError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.historyForbidden');
    }
    if (error.status === 404) {
      return t('errors.historyNotFound');
    }
    return t('errors.historyGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.historyNetwork');
  }
  return t('errors.historyGeneric');
}

/** Translates a `GET /api/notificacoes*` failure — a plain authenticated read with no special-case status to distinguish beyond network vs. generic. */
export function describeNotificationsError(error: unknown): string {
  if (isNetworkError(error)) {
    return t('errors.notificationsNetwork');
  }
  return t('errors.notificationsGeneric');
}

/** Translates a `GET /api/animais/{id}/custos` failure — same shape as `describePatientHistoryError`, a plain authenticated/authorized read. */
export function describePatientCostsError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.patientCostsForbidden');
    }
    if (error.status === 404) {
      return t('errors.patientCostsNotFound');
    }
    return t('errors.patientCostsGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.patientCostsNetwork');
  }
  return t('errors.patientCostsGeneric');
}

/** Translates a `GET /api/animais/{id}/historico-pdf` failure. Same `InvalidPdfError` class as the consultation-summary PDF (see consultaPdfService.ts) — a malformed/empty body is the same failure mode regardless of which PDF endpoint produced it. */
export function describePatientHistoryPdfError(error: unknown): string {
  if (error instanceof InvalidPdfError) {
    return t('errors.pdfInvalid');
  }
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.historyPdfForbidden');
    }
    if (error.status === 404) {
      return t('errors.historyNotFound');
    }
    return t('errors.historyPdfUnavailable');
  }
  return t('errors.historyPdfUnavailable');
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

/**
 * Translates a `POST /api/auth/register/responsavel` failure. Confirmed
 * against `ResponsavelRegistrationService`/`PasswordPolicy.java`: a password
 * policy violation, a confirmation mismatch, and Bean Validation failures are
 * all 400 with an already specific, human-readable message; a duplicate
 * e-mail/login or document is 409 ("E-mail/login ja cadastrado." /
 * "Documento de responsavel ja cadastrado."). Shown verbatim, same reasoning
 * as `describeRegistrationError`/`describeChangePasswordError`.
 */
export function describeResponsavelRegistrationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 409) {
      return error.message || t('errors.registrationResponsavelGeneric');
    }
    if (error.status >= 500) {
      return t('errors.registrationResponsavelUnavailable');
    }
    return t('errors.registrationResponsavelGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.registrationResponsavelNetwork');
  }
  return t('errors.registrationResponsavelGeneric');
}

/**
 * Translates a `POST /api/animais/{id}/compartilhamentos` failure. Confirmed
 * against `ClinicalAccessService.exigirCriacaoCompartilhamentoAnimal`: 403
 * means either the caller isn't a VETERINARIO/RESPONSAVEL, or has no read
 * access to this specific animal; 404 means the animal itself wasn't found.
 */
export function describeCreateShareError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.shareCreateForbidden');
    }
    if (error.status === 404) {
      return t('errors.shareCreateNotFound');
    }
    if (error.status >= 500) {
      return t('errors.shareCreateUnavailable');
    }
    return t('errors.shareCreateGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.shareCreateNetwork');
  }
  return t('errors.shareCreateGeneric');
}

/**
 * Translates a `POST /api/compartilhamentos/preview` failure — note this
 * only ever fires for a token the backend doesn't recognize at all (404) or
 * an infra problem. An expired/revoked/already-used token is a normal 200
 * response (`valid:false` + `status`), handled separately by the screen, not
 * through this function.
 */
export function describePreviewShareError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return t('errors.sharePreviewNotFound');
    }
    if (error.status >= 500) {
      return t('errors.sharePreviewUnavailable');
    }
    return t('errors.sharePreviewGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.sharePreviewNetwork');
  }
  return t('errors.sharePreviewGeneric');
}

/**
 * Translates a `POST /api/compartilhamentos/redeem` failure. Confirmed
 * against `PatientShareService`: 403 is a role mismatch
 * (`validateRecipientRole`) — should be rare in practice since the preview
 * screen already gates the Accept action by role client-side; 404 is an
 * unrecognized token; 409 is "already used"; 410 covers both expired and
 * revoked (the backend's own message already distinguishes which, shown
 * verbatim rather than collapsed into one generic sentence).
 */
export function describeRedeemShareError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return error.message || t('errors.shareRedeemRoleMismatch');
    }
    if (error.status === 404) {
      return t('errors.shareRedeemNotFound');
    }
    if (error.status === 409) {
      return error.message || t('errors.shareRedeemAlreadyUsed');
    }
    if (error.status === 410) {
      return error.message || t('errors.shareRedeemGone');
    }
    if (error.status >= 500) {
      return t('errors.shareRedeemUnavailable');
    }
    return t('errors.shareRedeemGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.shareRedeemNetwork');
  }
  return t('errors.shareRedeemGeneric');
}

/** Translates a `PATCH /api/diagnosticos/{id}/validacao-veterinaria` failure (veterinarian feedback on an AI insight). */
export function describeInsightFeedbackError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('errors.insightFeedbackForbidden');
    }
    if (error.status === 404) {
      return t('errors.insightFeedbackNotFound');
    }
    if (error.status >= 500) {
      return t('errors.insightFeedbackUnavailable');
    }
    return t('errors.insightFeedbackGeneric');
  }
  if (isNetworkError(error)) {
    return t('errors.insightFeedbackNetwork');
  }
  return t('errors.insightFeedbackGeneric');
}
