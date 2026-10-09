import { apiGet, apiPost, apiPut } from './apiClient';

/**
 * CONFIRMED against the ArkIve Spring Boot source (sibling project
 * `SPRINT-3/java-advanced`, `AnimalResponse.java`). `sexo` is constrained to
 * `M`/`F` because `AnimalService.validarSexoQuandoInformado` rejects any
 * other value; `castrado`/`ativo` follow the same confirmed S/N convention.
 */
export interface AnimalDto {
  id: number;
  /**
   * Permanent, opaque, non-secret public identifier (`ARK-PET-XXXXX-...`) —
   * display only, never an authorization mechanism. Nullable only for
   * defensiveness against pre-migration records; every animal the backend
   * returns today has one.
   */
  arkivePatientId: string | null;
  nome: string;
  especieId: number;
  especieNome: string;
  racaId: number | null;
  racaNome: string | null;
  sexo: 'M' | 'F' | null;
  castrado: 'S' | 'N';
  clinicaId: number | null;
  clinicaNome: string | null;
  ativo: 'S' | 'N';
  /** `AnimalResponse.dataNascimento` — `YYYY-MM-DD`, confirmed nullable (Batch 2). */
  dataNascimento: string | null;
}

/**
 * `AnimalRequest.java` — `nome`/`especieId` are the only `@NotBlank`/`@NotNull`
 * fields; the same record backs both create and update, so update must also
 * send them in full (Spring re-validates the whole body, not a partial
 * patch). `clinicaId`/`ativo` are deliberately never sent from this app: for
 * an authenticated VETERINARIO, `AnimalService.requestAutorizadoParaCriacao`/
 * `requestAutorizadoParaAtualizacao` derive the clinic themselves and reject
 * any `clinicaId` that doesn't match it, force `ativo="S"` on create, and
 * reject any `ativo` change on update (409) — there is nothing correct this
 * app could send for either field.
 */
export interface AnimalRequestInput {
  nome: string;
  especieId: number;
  racaId?: number | null;
  sexo?: 'M' | 'F' | null;
  castrado?: 'S' | 'N' | null;
  /**
   * `YYYY-MM-DD` or `null` to intentionally clear it — CONFIRMED PUT semantics
   * (`AnimalRequest.java`): an omitted/null value clears the field on update.
   * `PatientForm` always sends the current form value explicitly (never
   * omits this key) so an untouched edit round-trips the existing value
   * instead of silently wiping it.
   */
  dataNascimento?: string | null;
}

export interface MyPatientsFilters {
  nome?: string;
  especieId?: number;
  racaId?: number;
}

/**
 * CONFIRMED: `AnimalController.listarMeusPacientes` (`GET /api/animais/me`)
 * → `AnimalService.listarPacientesVeterinario`. This is the real,
 * veterinarian-scoped patient registry the backend added — patients this
 * veterinarian registered themselves, previously consulted, or that belong
 * to their clinic (if they have one). `veterinarioId` is derived from the
 * authenticated principal (never consultation history), and clinic
 * membership is entirely optional here (`clinicaVeterinarioAutenticadoOpcional`
 * never throws for a null clinic) — this app does not need to reproduce any
 * of those rules, Java is the source of truth for who's "mine".
 *
 * Deliberately NOT `/api/animais/clinica` — audited: as of this backend
 * change, both routes call the exact same service method with the exact
 * same arguments, but `/me` is the correctly-named one now that "clinic"
 * is no longer the operative concept.
 */
export async function listMyPatients(filters?: MyPatientsFilters): Promise<AnimalDto[]> {
  const params = new URLSearchParams();
  if (filters?.nome) params.set('nome', filters.nome);
  if (filters?.especieId != null) params.set('especieId', String(filters.especieId));
  if (filters?.racaId != null) params.set('racaId', String(filters.racaId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const page = await apiGet<{ content: AnimalDto[] }>(`/api/animais/me${query}`);
  return page.content;
}

/**
 * CONFIRMED: `AnimalController.listar` (`GET /api/animais`, no suffix) →
 * `AnimalService.listarAutorizado`, whose `switch` on `principal.getTipoUsuario()`
 * has a dedicated `RESPONSAVEL` branch (`animalRepository.buscarParaResponsavel`,
 * scoped to `principal.getResponsavelId()`) — this is the real, backend-authorized
 * "animals I have access to" list for a responsible person, not a client-side
 * filter. Deliberately NOT reused by `listMyPatients` (`/api/animais/me` is
 * VETERINARIO-only and means something different: "patients I registered or
 * previously consulted") — same underlying entity, two distinct, role-specific
 * endpoints, kept as two separate functions so neither name's meaning is diluted.
 */
export async function listAccessibleAnimals(filters?: MyPatientsFilters): Promise<AnimalDto[]> {
  const params = new URLSearchParams();
  if (filters?.nome) params.set('nome', filters.nome);
  if (filters?.especieId != null) params.set('especieId', String(filters.especieId));
  if (filters?.racaId != null) params.set('racaId', String(filters.racaId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const page = await apiGet<{ content: AnimalDto[] }>(`/api/animais${query}`);
  return page.content;
}

/**
 * CONFIRMED: `AnimalService.buscarPorIdAutorizado` → `ClinicalAccessService.exigirLeituraAnimal`
 * allows a veterinarian to read an active same-clinic patient OR a patient
 * they've previously consulted — either way, a plain by-id GET.
 */
export async function getPatientById(id: number): Promise<AnimalDto> {
  return apiGet<AnimalDto>(`/api/animais/${id}`);
}

/**
 * CONFIRMED: `AnimalController.criar` now permits VETERINARIO
 * (`AnimalService.requestAutorizadoParaCriacao`'s VETERINARIO branch). The
 * backend derives the clinic from the authenticated veterinarian and forces
 * `ativo="S"` — this app sends neither field.
 */
export async function createPatient(input: AnimalRequestInput): Promise<AnimalDto> {
  return apiPost<AnimalDto>('/api/animais', input);
}

/**
 * CONFIRMED: `AnimalService.requestAutorizadoParaAtualizacao`'s VETERINARIO
 * branch permits updating basic metadata of an active same-clinic patient,
 * but rejects any `clinicaId`/`ativo` change (409) — never send either.
 */
export async function updatePatient(id: number, input: AnimalRequestInput): Promise<AnimalDto> {
  return apiPut<AnimalDto>(`/api/animais/${id}`, input);
}
