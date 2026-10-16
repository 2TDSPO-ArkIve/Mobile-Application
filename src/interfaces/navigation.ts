import type { AnimalDto } from '../services/patientService';
import type { AuthMeResponse } from '../services/authService';

export type AuthStackParamList = {
  /** `prefillIdentifier` — set by the unified `RegisterScreen` after a successful cadastro, so the user doesn't have to retype the e-mail they just registered with. */
  Login: { prefillIdentifier?: string } | undefined;
  /**
   * Chunk 2: ONE unified registration screen — a `Veterinário | Responsável`
   * segmented selector up top decides which fields render. `initialRole` is
   * optional (the `LoginScreen`'s single "Criar conta" entry point omits it,
   * defaulting to VETERINARIO); `CadastroResponsavel` below is kept as a
   * route-name ALIAS of this exact same screen for backward compatibility —
   * `SharePreviewScreen`'s existing `navigate('CadastroResponsavel')` call
   * (and any other stale reference) still lands here with RESPONSAVEL
   * preselected, with no change needed at the call site.
   */
  Cadastro: { initialRole?: 'VETERINARIO' | 'RESPONSAVEL' } | undefined;
  /** Alias route for `Cadastro` — registered against the SAME `RegisterScreen` component (see `AuthStack.tsx`), which reads `useRoute().name` to preselect RESPONSAVEL when entered through this name. No separate screen/component exists for this anymore. */
  CadastroResponsavel: undefined;
  /**
   * No params — the screen always reads `PendingShareContext.pendingToken`
   * rather than a route param, so later deep-link/QR entry points can simply
   * call `setPendingToken(token)` then navigate here, without this route's
   * shape ever needing to change.
   */
  ConvitePaciente: undefined;
  /** QR scanner entry point — registered in all three stacks, one implementation (`ScanShareQrScreen`), no route params (it only ever calls `setPendingToken` + navigates to `ConvitePaciente`). */
  EscanearConvite: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Consultas: undefined;
  Pacientes: undefined;
};

/**
 * The RESPONSAVEL application shell. `PacienteDetalhe` here is the exact
 * same `PatientDetailScreen` component `AppStackParamList` uses (shared,
 * role-neutral display), typed independently in each param list rather than
 * sharing one big union.
 *
 * Chunk 3: `CadastrarAnimal`/`EditarAnimal` give RESPONSAVEL its own
 * write path, backed by `NewAnimalScreen`/`EditAnimalScreen` — deliberately
 * NOT `NovoPaciente`/`EditarPaciente` (the VETERINARIO screens embed
 * tutor-linking logic that doesn't apply to a RESPONSAVEL managing their own
 * animal). Clinical write screens (consultations, prescriptions, veterinary
 * administration) remain entirely absent from this stack.
 */
export type ResponsavelAppStackParamList = {
  MeusAnimais: undefined;
  CadastrarAnimal: undefined;
  EditarAnimal: { patientId: number };
  PacienteDetalhe: { patientId: number };
  /** Read-only clinical timeline — Java authorizes RESPONSAVEL access the same as VETERINARIO (`GET /api/animais/{id}/historico`), so this is not gated client-side by role. */
  HistoricoPaciente: { patientId: number };
  /** Read-only cost dashboard — same cross-role authorization note as `HistoricoPaciente`. */
  CustosPaciente: { patientId: number };
  CompartilharPaciente: { patientId: number };
  ConvitePaciente: undefined;
  EscanearConvite: undefined;
  /** Explicit ArkIve-ID lookup — retrieval only, same read-authorization rule as every other patient fetch; never creates/imports a patient. */
  BuscarPacienteArkive: undefined;
  /** Chunk 7 — incoming access requests this Responsible is currently eligible to decide on (`GET /api/solicitacoes-acesso`, Java-scoped). `focusRequestId` highlights one row when reached from a `SOLICITACAO_ACESSO` notification tap — it never fetches a single request on its own; the full, correctly-scoped list already contains it. */
  SolicitacoesAcessoRecebidas: { focusRequestId?: number } | undefined;
  /** New permanent report history (`AnimalReportsScreen`, Java V18) — shared with `AppStackParamList` below (same component, reused cross-role, same minimal-inline-param pattern as `PacienteDetalhe`/`HistoricoPaciente`). */
  RelatosAnimal: { patientId: number };
  /** RESPONSAVEL-only creation screen — this route name only ever exists in THIS stack; a VETERINARIO session never navigates to it (the backend create endpoint is RESPONSAVEL-only regardless). */
  NovoRelatoAnimal: { patientId: number };
  MinhaConta: undefined;
  Configuracoes: undefined;
  AlterarSenha: undefined;
  Notificacoes: undefined;
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
  HistoricoPaciente: { patientId: number };
  CustosPaciente: { patientId: number };
  CompartilharPaciente: { patientId: number };
  ConvitePaciente: undefined;
  EscanearConvite: undefined;
  /** Manual invitation-code entry — VETERINARIO-only fallback transport alongside QR/link; no route params (reads/writes `PendingShareContext` directly, same as `EscanearConvite`). */
  InserirCodigoConvite: undefined;
  /** Explicit ArkIve-ID lookup — retrieval only, same read-authorization rule as every other patient fetch; never creates/imports a patient. */
  BuscarPacienteArkive: undefined;
  Prescricoes: { consultaId: number };
  NovaPrescricao: { consultaId: number };
  PrescricaoDetalhe: { prescricaoId: number; consultaId: number };
  EditarPrescricao: { prescricaoId: number; consultaId: number };
  Perfil: undefined;
  /** Chunk 6 — "Resumo financeiro". VETERINARIO-only: this route does not exist in `ResponsavelAppStackParamList`, and the backend endpoint it reads (`GET /api/veterinarios/me/custos`) is `hasRole("VETERINARIO")`-gated regardless. No params — always "my own" data, never a chosen veterinarianId. */
  ValoresVeterinario: undefined;
  /** Chunk 7 — the veterinarian's own outgoing access requests. VETERINARIO-only, read-only tracking (approval/rejection is exclusively the Responsible's own route, `SolicitacoesAcessoRecebidas`, which does not exist in this stack). */
  SolicitacoesAcessoEnviadas: undefined;
  /** New permanent report history, READ-ONLY for VETERINARIO — same `AnimalReportsScreen` component `ResponsavelAppStackParamList` registers; this stack never registers `NovoRelatoAnimal` at all, since the backend create endpoint is RESPONSAVEL-only. */
  RelatosAnimal: { patientId: number };
  Configuracoes: undefined;
  AlterarSenha: undefined;
  Notificacoes: undefined;
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
  /**
   * Derived once here, from `identity.tipo`, rather than scattered across
   * screens as `identity?.tipo === 'VETERINARIO'`. Both false while
   * `identity` is null (not yet authenticated). Role is a separate dimension
   * from `status` — these do not replace or duplicate the `AuthStatus` model.
   */
  isVeterinario: boolean;
  isResponsavel: boolean;
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