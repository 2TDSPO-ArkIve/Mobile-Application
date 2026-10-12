import { apiGet, apiPost, ApiError, isNetworkError } from './apiClient';
import { t } from '../i18n/store';
import type { StoredCredentials } from '../storage/credentialStore';

/**
 * Confirmed against `AuthMeResponse.java` — every field here is a direct
 * match. The mobile app now authenticates two account types:
 * - VETERINARIO: `veterinarioId`/`crmv`/`email` populated, `responsavelId` null.
 * - RESPONSAVEL: `responsavelId` populated, `veterinarioId`/`crmv`/`email` null
 *   (a responsible person's e-mail lives on `login`, not on this `email`
 *   field — that one is sourced from `Veterinario.email` server-side and is
 *   simply absent for a RESPONSAVEL).
 * `clinicaId` may legitimately be null for either role.
 */
export interface AuthMeResponse {
  usuarioId: number;
  nome: string;
  tipo: string;
  login: string;
  trocaSenhaObrigatoria: boolean;
  responsavelId: number | null;
  veterinarioId: number | null;
  crmv: string | null;
  email: string | null;
  clinicaId: number | null;
}

/**
 * The two account types the mobile app authenticates. SYSADMIN and
 * ADMIN_CLINICA remain web/admin-only — rejected the same way an unknown
 * `tipo` would be, below.
 */
const ALLOWED_MOBILE_ROLES = ['VETERINARIO', 'RESPONSAVEL'] as const;

export type CredentialVerificationResult =
  | { ok: true; identity: AuthMeResponse; requiresPasswordChange: boolean }
  | {
      ok: false;
      reason: 'invalid' | 'forbidden' | 'unreachable' | 'unknown';
      message: string;
    };

/**
 * Spring Security exposes no dedicated `/login` endpoint — auth for
 * `/api/**` is plain HTTP Basic, checked independently on every request.
 * `GET /api/auth/me` is the correct probe for "are these credentials valid,
 * and who do they belong to": unlike the previous `GET /api/consultas`
 * probe, it's explicitly allowed even while `trocaSenha=S` (confirmed in
 * `MandatoryPasswordChangeFilter` — only this and `POST
 * /api/auth/change-password` are exempt), which is exactly the state a
 * freshly-provisioned veterinarian is in on their very first login. Using
 * the old consultation-scoped probe there returned a 403 from the
 * mandatory-password-change filter and made a brand-new account look like
 * an invalid login.
 *
 * Also confirms the account is one of the two roles this app supports
 * (VETERINARIO or RESPONSAVEL) — an ADMIN_CLINICA/SYSADMIN session (or any
 * future/unknown `tipo`) is treated the same as "forbidden" rather than
 * silently proceeding with an identity nothing in this app knows how to use.
 */
export async function verifyCredentials(
  credentials: StoredCredentials
): Promise<CredentialVerificationResult> {
  try {
    const identity = await apiGet<AuthMeResponse>('/api/auth/me', { authOverride: credentials });

    if (!ALLOWED_MOBILE_ROLES.includes(identity.tipo as (typeof ALLOWED_MOBILE_ROLES)[number])) {
      return { ok: false, reason: 'forbidden', message: t('auth.wrongRole') };
    }

    return { ok: true, identity, requiresPasswordChange: identity.trocaSenhaObrigatoria };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { ok: false, reason: 'invalid', message: t('auth.invalidCredentials') };
      }

      if (error.status === 403) {
        return { ok: false, reason: 'forbidden', message: t('auth.wrongRole') };
      }

      return { ok: false, reason: 'unknown', message: t('auth.verifyUnknown') };
    }

    if (isNetworkError(error)) {
      return { ok: false, reason: 'unreachable', message: t('auth.unreachable') };
    }

    return { ok: false, reason: 'unknown', message: t('auth.verifyUnexpected') };
  }
}

/**
 * `POST /api/auth/change-password` — confirmed against `AuthController`/
 * `AlterarSenhaApiRequest.java`: body is exactly `{ novaSenha }`, authenticated
 * with whatever Basic Auth credential is currently stored (the OLD/temporary
 * one — this call must happen BEFORE the stored credential is replaced).
 * Success is a bare 204, already handled generically by `apiClient`.
 *
 * This function only performs the request — it deliberately does not touch
 * `credentialStore`/`AuthContext` itself; the caller (`AuthContext`, see the
 * critical sequencing note there) owns replacing the stored credential and
 * re-verifying with the new one afterward.
 */
export async function changePassword(newPassword: string): Promise<void> {
  await apiPost<void>('/api/auth/change-password', { novaSenha: newPassword });
}

/** Confirmed against `VeterinarioResponse.java` — same shape returned by the SysAdmin-facing veterinarian creation flow this endpoint reuses server-side. */
export interface VeterinarioRegistrationResponse {
  id: number;
  nome: string;
  crmv: string;
  especialidade: string | null;
  email: string;
  clinicaId: number | null;
  clinicaNome: string | null;
  ativo: string;
}

export interface VeterinarioRegistrationInput {
  nome: string;
  crmv: string;
  email: string;
}

/**
 * `POST /api/auth/register` — the one deliberate public exception on
 * `/api/**` (confirmed in `SecurityConfig`: method+path specific). No
 * `authOverride` is passed and none is needed: this call only ever happens
 * from the unauthenticated Cadastro screen, where `apiClient` already has no
 * stored credential to attach.
 *
 * There is no password field here on purpose — the backend provisions the
 * account with the e-mail itself as a temporary password (BCrypt-hashed,
 * `trocaSenha=S`), exactly like the existing SysAdmin-created-veterinarian
 * flow. The veterinarian sets their real password on first login via the
 * app's existing mandatory-password-change screen — this call never accepts
 * or transmits a client-chosen password.
 */
export async function registerVeterinario(
  input: VeterinarioRegistrationInput
): Promise<VeterinarioRegistrationResponse> {
  return apiPost<VeterinarioRegistrationResponse>('/api/auth/register', input);
}

/** Confirmed against `RegistroResponsavelResponse.java`. `trocaSenhaObrigatoria` is always `false` here — unlike veterinarian provisioning, the responsible person chose their own password at registration. */
export interface ResponsavelRegistrationResponse {
  usuarioId: number;
  responsavelId: number;
  nome: string;
  email: string;
  tipo: string;
  ativo: string;
  trocaSenhaObrigatoria: boolean;
}

export interface ResponsavelRegistrationInput {
  nome: string;
  documento: string;
  email: string;
  /** Omitted entirely (not sent as an empty string) when left blank — matches `RegistroResponsavelRequest.telefone`'s optional, nullable contract. */
  telefone?: string;
  senha: string;
  confirmacaoSenha: string;
}

/**
 * `POST /api/auth/register/responsavel` — confirmed public (method+path
 * specific, same pattern as `/api/auth/register`) in `SecurityConfig`. Unlike
 * veterinarian self-registration, the responsible person chooses their own
 * password here and there is no mandatory first-login password change
 * (`ResponsavelRegistrationService` always persists `trocaSenha='N'`).
 *
 * Registration itself does not create an Animal, an AnimalResponsavel link,
 * or any PatientAccess — it only creates the account. Patient access comes
 * later, through sharing (not implemented yet).
 */
export async function registerResponsavel(
  input: ResponsavelRegistrationInput
): Promise<ResponsavelRegistrationResponse> {
  return apiPost<ResponsavelRegistrationResponse>('/api/auth/register/responsavel', input);
}
