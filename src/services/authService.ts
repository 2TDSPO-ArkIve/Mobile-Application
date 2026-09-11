import { apiGet, apiPost, ApiError, isNetworkError } from './apiClient';
import { t } from '../i18n/store';
import type { StoredCredentials } from '../storage/credentialStore';

/**
 * Confirmed against `AuthMeResponse.java` — every field here is a direct
 * match. `responsavelId` is only ever populated for a RESPONSAVEL account;
 * this app is veterinarian-only, so it's typed but never expected to be
 * used. For an authenticated VETERINARIO, `veterinarioId` is always
 * resolvable (derived from the Usuario/Veterinario relationship, never from
 * consultation history), and `clinicaId` may legitimately be null.
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

const VETERINARIO_TIPO = 'VETERINARIO';

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
 * Also confirms the account is actually a VETERINARIO — this app has no use
 * for a RESPONSAVEL/ADMIN_CLINICA/SYSADMIN session, so that's treated the
 * same as "forbidden" rather than silently proceeding with an identity nothing
 * else in this app knows how to use.
 */
export async function verifyCredentials(
  credentials: StoredCredentials
): Promise<CredentialVerificationResult> {
  try {
    const identity = await apiGet<AuthMeResponse>('/api/auth/me', { authOverride: credentials });

    if (identity.tipo !== VETERINARIO_TIPO) {
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
