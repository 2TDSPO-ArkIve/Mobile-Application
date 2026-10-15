import { apiGet, apiPatch, apiPost, apiPut } from './apiClient';

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

/**
 * `busca` (Chunk 1) is the unified search term — confirmed against
 * `AnimalController`/`AnimalRepository`: it matches partial/full animal name
 * OR partial/full ArkIve id (`lower(a.nome) like ... or
 * lower(a.arkivePatientId) like ...`), applied server-side ON TOP OF the
 * existing role-scoped authorization query for each endpoint — an animal the
 * caller cannot access is never returned just because its ArkIve id matches.
 * The backend still accepts the older `nome` param as a fallback
 * (`buscaEfetiva(busca, nome)` — `busca` wins when both are sent), but this
 * app only ever sends `busca` now.
 */
export interface MyPatientsFilters {
  busca?: string;
  especieId?: number;
  racaId?: number;
}

function buildAnimalListQuery(filters?: MyPatientsFilters): string {
  const params = new URLSearchParams();
  if (filters?.busca) params.set('busca', filters.busca);
  if (filters?.especieId != null) params.set('especieId', String(filters.especieId));
  if (filters?.racaId != null) params.set('racaId', String(filters.racaId));
  const query = params.toString();
  return query ? `?${query}` : '';
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
  const page = await apiGet<{ content: AnimalDto[] }>(`/api/animais/me${buildAnimalListQuery(filters)}`);
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
  const page = await apiGet<{ content: AnimalDto[] }>(`/api/animais${buildAnimalListQuery(filters)}`);
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

/**
 * CONFIRMED: `AnimalController.buscarPorArkivePatientId` →
 * `AnimalService.buscarPorArkivePatientIdAutorizado` — loads the animal by
 * its permanent `arkivePatientId` first (404 `ResourceNotFoundException` if
 * no such patient exists at all), THEN runs the exact same
 * `ClinicalAccessService.exigirLeituraAnimal` read-authorization check used
 * by `getPatientById` (403 if the caller has no legitimate access). This is
 * deliberately the SAME authorization rule as every other patient read —
 * knowing the ArkIve ID is never, by itself, sufficient to see the record.
 *
 * `encodeURIComponent` on the path segment: the id itself only ever contains
 * `[A-Z0-9-]` in practice, but this guards against any future generator
 * change without this app needing to assume a fixed character set.
 */
export async function getPatientByArkiveId(arkivePatientId: string): Promise<AnimalDto> {
  return apiGet<AnimalDto>(`/api/animais/arkive/${encodeURIComponent(arkivePatientId)}`);
}

/**
 * CONFIRMED against `ObservacaoResponsavelResponse.java` — a pending note the
 * RESPONSAVEL keeps for the ANIMAL itself (`DS_OBS_RESP_PENDENTE`), distinct
 * from `ConsultaDto.observacaoResponsavel`/`AnimalHistoryConsultation
 * .observacaoResponsavel` (`DS_OBS_RESPONSAVEL`), which is a per-consultation
 * SNAPSHOT the backend copies this pending note into — and clears here —
 * the moment that consultation transitions AG→EP
 * (`ConsultaWorkflowService.consumirObservacaoResponsavel`). Never conflate
 * the two: this endpoint always reflects what is still PENDING, not what any
 * past consultation already consumed.
 */
export interface AnimalObservationDto {
  animalId: number;
  observacao: string | null;
}

/**
 * CONFIRMED against `AnimalController`/`AnimalService.buscarObservacaoResponsavel`
 * (`GET /api/animais/{id}/observacao-responsavel`) — RESPONSAVEL-only at the
 * Spring Security filter chain level, and further gated in the service by
 * `exigirResponsavelVinculado` (the caller must have an ACTIVE, currently-
 * vigent `AnimalResponsavel` link to this exact animal — not merely any
 * RESPONSAVEL, and never a generic `PatientAccess` share grant). 403 if not
 * linked, 404 if the animal doesn't exist.
 */
export async function getAnimalObservation(animalId: number): Promise<AnimalObservationDto> {
  return apiGet<AnimalObservationDto>(`/api/animais/${animalId}/observacao-responsavel`);
}

/**
 * CONFIRMED against `ObservacaoResponsavelRequest.java`
 * (`PATCH /api/animais/{id}/observacao-responsavel`) — body field is exactly
 * `observacao`, `@Size(max = 2000)`, no `@NotBlank`: a blank/whitespace-only
 * string (or `null`) is explicitly treated server-side as "clear the pending
 * observation" (`AnimalService.atualizarObservacaoResponsavel` trims and
 * nulls it), not an error. Same RESPONSAVEL + active-vinculo authorization
 * as the GET above.
 */
export async function updateAnimalObservation(
  animalId: number,
  observacao: string | null
): Promise<AnimalObservationDto> {
  return apiPatch<AnimalObservationDto>(`/api/animais/${animalId}/observacao-responsavel`, { observacao });
}
