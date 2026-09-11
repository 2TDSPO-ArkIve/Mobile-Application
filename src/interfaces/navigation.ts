import type { AnimalDto } from '../services/patientService';
import type { AuthMeResponse } from '../services/authService';

export type AuthStackParamList = {
  /** `prefillIdentifier` — set by RegisterScreen after a successful cadastro, so the veterinarian doesn't have to retype the e-mail they just registered with. */
  Login: { prefillIdentifier?: string } | undefined;
  Cadastro: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Consultas: undefined;
  Pacientes: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  ConsultaDetalhe: { consultaId: number };
  EditarConsulta: { consultaId: number };
  AnaliseArkive: { consultaId: number };
  InsightArkive: { consultaId: number };
  ConclusaoVeterinaria: { consultaId: number };
  CriarConsulta: { preselectedAnimal?: AnimalDto } | undefined;
  /** `returnToConsulta` distinguishes "opened from NewConsultaScreen's own patient search" (post-create, hop back to CriarConsulta with the new patient preselected) from every other entry point (e.g. the Patients tab's own "Cadastrar paciente" action), which should land on the new patient's own detail screen instead. */
  NovoPaciente: { returnToConsulta?: boolean } | undefined;
  PacienteDetalhe: { patientId: number };
  EditarPaciente: { patientId: number };
  Prescricoes: { consultaId: number };
  NovaPrescricao: { consultaId: number };
  PrescricaoDetalhe: { prescricaoId: number; consultaId: number };
  EditarPrescricao: { prescricaoId: number; consultaId: number };
  Perfil: undefined;
  Configuracoes: undefined;
  AlterarSenha: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  PasswordChange: undefined;
};

/**
 * `initializing` — SecureStore/backend revalidation on app start hasn't
 *   resolved yet; navigation must not render Auth or App yet.
 * `authenticated` — a credential pair was accepted by Spring on this session,
 *   and the account's `trocaSenhaObrigatoria` is false.
 * `password-change-required` — the credential pair was accepted (real login
 *   success), but the backend reports a mandatory password change still
 *   pending (`trocaSenhaObrigatoria=true`, confirmed always true for a
 *   freshly-provisioned veterinarian using their e-mail as a temporary
 *   password). The credential IS retained here (not discarded) — the
 *   password-change endpoint itself needs it — but normal clinical
 *   navigation must stay inaccessible until it clears.
 * `unauthenticated` — no credential stored, or it was confirmed invalid/forbidden.
 * `unreachable` — a stored credential exists but the backend couldn't be
 *   reached to confirm it (Render cold start, network drop, 5xx). The
 *   credential is kept — this is deliberately not the same as "logged out".
 */
export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'password-change-required'
  | 'unauthenticated'
  | 'unreachable';

export interface AuthContextValue {
  status: AuthStatus;
  /** The authenticated veterinarian's login identifier (whatever they typed — e-mail or CRMV), or null when signed out. */
  username: string | null;
  /**
   * The real identity from `GET /api/auth/me` — populated whenever `status`
   * is `authenticated` or `password-change-required`, null otherwise.
   */
  identity: import('../services/authService').AuthMeResponse | null;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Re-runs credential verification against the backend (e.g. to leave the `unreachable` state). */
  refreshUser: () => Promise<void>;
  /**
   * Completes the mandatory first-login password change. See the detailed
   * sequencing note on the implementation (`AuthContext.tsx`) — critically,
   * this replaces the stored credential's password (never the username) only
   * AFTER the backend confirms the change, then re-verifies with the NEW
   * password before ever reporting success. Returns an error message, or
   * null on success (mirrors `login`'s contract).
   */
  changePassword: (newPassword: string) => Promise<string | null>;
}