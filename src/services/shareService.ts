import { apiGet, apiPost, apiDelete } from './apiClient';

/**
 * CONFIRMED against the ArkIve Spring Boot source (sibling project
 * `SPRINT-3/java-advanced`, `entity/PatientAccessRole.java`) — exactly these
 * two values. This is the backend/security role for a sharing invitation,
 * never "TUTOR" — the UI may label the RESPONSAVEL option "Tutor /
 * Responsável", but the wire value sent to the backend is always the enum
 * name.
 */
export type PatientAccessRole = 'VETERINARIO' | 'RESPONSAVEL';

/** CONFIRMED against `PatientShareService.status`/`PatientSharePreviewResponse` — the only four values the backend ever returns. */
export type PatientShareStatus = 'PENDING' | 'USED' | 'REVOKED' | 'EXPIRED';

/** `PatientShareCreatedResponse.java` — returned ONLY at creation time. `rawToken` is the one and only place the plaintext invitation token ever appears; it is never returned again by any other endpoint. */
export interface PatientShareCreatedDto {
  invitationId: number;
  rawToken: string;
  invitationType: PatientAccessRole;
  expiresAt: string;
}

/**
 * `PatientSharePreviewResponse.java`. CONFIRMED: `POST /api/compartilhamentos/preview`
 * does NOT throw for an expired/revoked/already-used token — it still
 * resolves with `valid:false` and the matching `status`, HTTP 200. The
 * endpoint only throws (404) when the token doesn't correspond to any
 * invitation at all. Callers must handle both cases.
 */
export interface PatientSharePreviewDto {
  valid: boolean;
  status: PatientShareStatus;
  patientName: string;
  speciesName: string;
  invitationType: PatientAccessRole;
  invitedByName: string;
  expiresAt: string;
}

/**
 * `PatientAccessResponse.java` — the redeem response. CONFIRMED it carries
 * `animalId` directly, so a successful redemption can navigate straight to
 * the patient without a second lookup. `effective` mirrors
 * `PatientAccess.isEffectiveAt(now)` — true unless revoked/expired, which
 * cannot happen for a freshly granted/reused access from redeem.
 */
export interface PatientAccessDto {
  id: number;
  animalId: number;
  arkivePatientId: string | null;
  userId: number;
  userName: string;
  accessRole: PatientAccessRole;
  grantedByUserId: number;
  grantedAt: string;
  expiresAt: string | null;
  revokedByUserId: number | null;
  revokedAt: string | null;
  effective: boolean;
}

/** `PatientShareResponse.java` — one invitation's own history/status (list for an animal, or the result of revoking one). Not consumed by any screen this phase; typed for the access-management UI planned later. */
export interface PatientShareInvitationDto {
  invitationId: number;
  arkivePatientId: string | null;
  invitationType: PatientAccessRole;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByUserId: number | null;
  revokedAt: string | null;
  status: PatientShareStatus;
}

/**
 * `POST /api/animais/{animalId}/compartilhamentos` — CONFIRMED authenticated
 * (not public; falls through to the generic `/api/**` authenticated rule in
 * `SecurityConfig`), allowed for VETERINARIO or RESPONSAVEL who already has
 * read access to this animal (`ClinicalAccessService.exigirCriacaoCompartilhamentoAnimal`).
 * The raw token in the response is the ONLY time it's ever visible — never
 * log it, never persist it anywhere but the dedicated pending-share
 * SecureStore slot (see `storage/pendingShareStore.ts`), never put it in a
 * TanStack Query key.
 */
export async function createPatientShare(
  animalId: number,
  invitationType: PatientAccessRole
): Promise<PatientShareCreatedDto> {
  return apiPost<PatientShareCreatedDto>(`/api/animais/${animalId}/compartilhamentos`, { invitationType });
}

/**
 * `POST /api/compartilhamentos/preview` — CONFIRMED the one deliberate public
 * exception among the sharing endpoints (method+path specific permitAll in
 * `SecurityConfig`). Works identically whether or not a credential happens to
 * be stored (`apiClient` simply omits the Authorization header when none is
 * stored) — this call must never be gated behind authentication.
 */
export async function previewPatientShare(token: string): Promise<PatientSharePreviewDto> {
  return apiPost<PatientSharePreviewDto>('/api/compartilhamentos/preview', { token });
}

/**
 * `POST /api/compartilhamentos/redeem` — authenticated. CONFIRMED:
 * `PatientShareService.redeem` rejects a role mismatch with 403 BEFORE
 * touching any access row (`validateRecipientRole`), and reuses an existing
 * `PatientAccess` rather than duplicating one
 * (`PatientAccessService.grantOrGetExisting`) — a redemption by someone who
 * already had access is still a real, successful 200, not an error.
 */
export async function redeemPatientShare(token: string): Promise<PatientAccessDto> {
  return apiPost<PatientAccessDto>('/api/compartilhamentos/redeem', { token });
}

/** `GET /api/animais/{animalId}/compartilhamentos` — this animal's invitation history. Not consumed by any screen this phase (no invitation-list UI yet); typed for forward compatibility. */
export async function listPatientShareInvitations(animalId: number): Promise<PatientShareInvitationDto[]> {
  return apiGet<PatientShareInvitationDto[]>(`/api/animais/${animalId}/compartilhamentos`);
}

/** `DELETE /api/compartilhamentos/{invitationId}` — only the invitation's creator or SYSADMIN may call this (`PatientShareService.revoke`). Not consumed by any screen this phase. */
export async function revokePatientShareInvitation(invitationId: number): Promise<PatientShareInvitationDto> {
  return apiDelete<PatientShareInvitationDto>(`/api/compartilhamentos/${invitationId}`);
}

/** `GET /api/animais/{animalId}/acessos` — this animal's current access grants. Not consumed by any screen this phase; typed for the access-management UI planned later. */
export async function listPatientAccess(animalId: number): Promise<PatientAccessDto[]> {
  return apiGet<PatientAccessDto[]>(`/api/animais/${animalId}/acessos`);
}

/** `DELETE /api/animais/{animalId}/acessos/{accessId}` — not consumed by any screen this phase. */
export async function revokePatientAccess(animalId: number, accessId: number): Promise<PatientAccessDto> {
  return apiDelete<PatientAccessDto>(`/api/animais/${animalId}/acessos/${accessId}`);
}
