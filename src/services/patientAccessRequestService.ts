import { apiGet, apiPost } from './apiClient';

/** `PatientAccessRequestStatus.java` — confirmed exactly these three values (English, no accents). Never invent a fourth state. */
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * `PatientAccessRequestResponse.java` — ONE shared DTO used for create, list,
 * single-GET, approve, and reject (confirmed — not separate per-operation
 * shapes). Field VISIBILITY differs by audience server-side, not the shape:
 * - `animalNome` is `null` for the requesting VETERINARIO's own view UNLESS
 *   the request is `APPROVED` and the resulting access is currently
 *   effective (not revoked/expired) — never populated speculatively before
 *   that. Always populated for the deciding RESPONSAVEL.
 * - `resolvedByUserId` is ALWAYS `null` for the requesting veterinarian
 *   (confirmed: "nunca exposto ao veterinário solicitante") — always
 *   populated for the RESPONSAVEL once resolved.
 * This app never tries to infer or backfill either field — it renders
 * exactly what the backend sent for the current session's role.
 */
export interface AccessRequestDto {
  id: number;
  arkivePatientId: string;
  animalNome: string | null;
  requesterUserId: number;
  veterinarioId: number;
  veterinarioNome: string;
  crmv: string;
  status: AccessRequestStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resultingAccessId: number | null;
}

/** `CreatePatientAccessRequest.java` — the ONLY field; no `animalId` alternative exists. Always the normalized, permanent ArkIve ID (see `utils/arkivePatientId.ts`), never the internal numeric id. */
export interface CreateAccessRequestInput {
  arkivePatientId: string;
}

export interface ListAccessRequestsParams {
  status?: AccessRequestStatus;
  page?: number;
  size?: number;
}

/** No pagination UI exists yet for this list, same convention as every other unpaginated list in this app (notifications, patient costs) — request a bounded first page explicitly. */
const DEFAULT_PAGE_SIZE = 50;

function buildListQuery(params?: ListAccessRequestsParams): string {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  search.set('page', String(params?.page ?? 0));
  search.set('size', String(params?.size ?? DEFAULT_PAGE_SIZE));
  return `?${search.toString()}`;
}

/**
 * `POST /api/solicitacoes-acesso` — confirmed `PatientAccessRequestController.criar`,
 * VETERINARIO-only (`SecurityConfig`), `201 Created`. Java independently
 * validates the ArkIve ID exists, the animal is active, the requester
 * doesn't already have access, no pending duplicate exists, and at least one
 * eligible Responsible exists to decide it — this call never locally assumes
 * any of those; a rejection surfaces via the thrown `ApiError` exactly as
 * Java reports it.
 */
export async function createAccessRequest(input: CreateAccessRequestInput): Promise<AccessRequestDto> {
  return apiPost<AccessRequestDto>('/api/solicitacoes-acesso', input);
}

/**
 * `GET /api/solicitacoes-acesso` — confirmed `PatientAccessRequestController.listar`,
 * VETERINARIO or RESPONSAVEL. Java ITSELF branches the result by the caller's
 * role: a VETERINARIO sees only their own outgoing requests
 * (`findForRequester`); a RESPONSAVEL sees only requests for animals where
 * they currently hold an active/vigente `AnimalResponsavel` link
 * (`findForCurrentResponsible`) — i.e. exactly the ones they're eligible to
 * decide on. This app sends no role parameter of any kind; it is
 * structurally impossible to request the "other" view.
 */
export async function listAccessRequests(params?: ListAccessRequestsParams): Promise<AccessRequestDto[]> {
  const page = await apiGet<{ content: AccessRequestDto[] }>(`/api/solicitacoes-acesso${buildListQuery(params)}`);
  return page.content;
}

/**
 * `POST /api/solicitacoes-acesso/{id}/aprovar` — confirmed RESPONSAVEL-only,
 * NO request body (confirmed: the controller method takes only the path
 * variable + principal). Java enforces the caller holds a CURRENT, ACTIVE
 * `AnimalResponsavel` link to this exact animal — this app never sends a
 * `responsavelId` or any claim of ownership; the authenticated session alone
 * is read server-side. Idempotent if already `APPROVED` (returns the
 * existing state); a prior `REJECTED` request returns 409.
 */
export async function approveAccessRequest(id: number): Promise<AccessRequestDto> {
  return apiPost<AccessRequestDto>(`/api/solicitacoes-acesso/${id}/aprovar`);
}

/**
 * `POST /api/solicitacoes-acesso/{id}/rejeitar` — same contract/authorization
 * shape as `approveAccessRequest`, no request body. Idempotent if already
 * `REJECTED`; a prior `APPROVED` request returns 409.
 */
export async function rejectAccessRequest(id: number): Promise<AccessRequestDto> {
  return apiPost<AccessRequestDto>(`/api/solicitacoes-acesso/${id}/rejeitar`);
}
