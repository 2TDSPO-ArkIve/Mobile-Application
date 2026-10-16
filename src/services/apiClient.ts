import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from '../config/api';
import { encodeBase64 } from '../utils/base64';
import { getCredentials, type StoredCredentials } from '../storage/credentialStore';
import { emitUnauthorized } from './authEvents';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /**
     * `ErrorResponse.fields` (Chunk 2) — populated ONLY when Java's
     * `GlobalExceptionHandler.handleValidation` catches a
     * `MethodArgumentNotValidException` (bean-validation failures on a
     * `@Valid @RequestBody`, e.g. registration). Keys are the exact request
     * DTO field/record-component names (e.g. `"nome"`, `"documento"`), so a
     * caller can map them straight to a form field with no guessing. Absent
     * for a `BusinessException` (duplicate email, invalid CPF, password
     * policy, ...) — those only ever have a flat `message`.
     */
    public readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sem conexão com o servidor.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof TypeError;
}

/**
 * True for infrastructure hiccups (cold engine, network blip) that are safe
 * to retry automatically — 500/502/503/504 and any network-level failure.
 * Never true for auth/validation/not-found errors (400/401/403/404/422),
 * which need the caller's attention instead of a silent retry.
 */
export function isTransientInfraError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504;
  }
  return isNetworkError(error);
}

function buildBasicAuthHeader({ username, password }: StoredCredentials): string {
  return `Basic ${encodeBase64(`${username}:${password}`)}`;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Verify a credential pair that hasn't been persisted yet (used only by
   * the login probe in authService.verifyCredentials). Normal authenticated
   * traffic must never pass this — it always reads from credentialStore.
   */
  authOverride?: StoredCredentials;
}

/** Shared by every request path (JSON and binary alike) — the one place credentials become a header. */
async function resolveAuthHeaders(
  authOverride: StoredCredentials | undefined,
  extraHeaders: Record<string, string> | undefined
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  const credentials = authOverride ?? (await getCredentials());
  if (credentials) {
    headers.Authorization = buildBasicAuthHeader(credentials);
  }
  return headers;
}

/**
 * Shared by every request path — parses the backend's JSON error shape,
 * fires the global 401 handler under the exact same rule as before, and
 * throws `ApiError`. A binary endpoint (e.g. the consultation PDF) still
 * returns a normal JSON error body on failure — only a 2xx response is ever
 * binary — so this needs no binary-specific branch.
 */
async function throwForNonOkResponse(response: Response, authOverride: StoredCredentials | undefined): Promise<never> {
  let message = response.statusText || `Erro ${response.status}`;
  let fields: Record<string, string> | undefined;
  try {
    // Confirmed live shape from the real backend's error body:
    // {"timestamp":...,"status":401,"error":"Unauthorized","message":"Autenticacao obrigatoria.","path":...}
    // `message` carries the specific, human-actionable text; `error` is
    // just the generic HTTP reason phrase — prefer `message`. `fields`
    // (Chunk 2) is only ever present on a bean-validation 400 — see
    // `ApiError.fields`'s own note.
    const parsed = (await response.json()) as { error?: string; message?: string; fields?: Record<string, string> };
    message = parsed.message ?? parsed.error ?? message;
    fields = parsed.fields ?? undefined;
  } catch {
    /* body wasn't JSON — keep the fallback message */
  }

  if (response.status === 401 && !authOverride) {
    // A 401 on a request that used the *stored* credential means the
    // session Spring Security accepted before is no longer valid (password
    // changed, account disabled, ...). A 401 during the login probe
    // (authOverride set) is an expected, locally-handled outcome instead —
    // it must not trigger a global sign-out of an already-authenticated user.
    emitUnauthorized();
  }

  throw new ApiError(response.status, message, fields);
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, authOverride, headers: extraHeaders, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;

  // A FormData body (multipart uploads — see transcricaoService.ts) must
  // never be JSON.stringify'd, and must never get an explicit Content-Type:
  // fetch has to compute its own `multipart/form-data; boundary=...` from
  // the FormData instance itself. Setting one manually here would produce a
  // header with no boundary and a body Spring can't parse.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers = await resolveAuthHeaders(authOverride, {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(extraHeaders as Record<string, string> | undefined),
  });

  let response: Response;
  try {
    // Explicit `expo/fetch` (not the ambient global) — this is the
    // WinterCG-compliant implementation whose FormData/Blob handling
    // `expo-file-system`'s `File` is actually designed against. Confirmed via
    // `expo/build/winter/fetch/convertFormData.ts`: it does not understand
    // React Native's classic `{uri, name, type}` pseudo-blob at all
    // ("`uri` is not supported for React Native's FormData"), and it has an
    // explicit `'bytes' in entry` branch specifically for File-like values
    // that "don't extend Blob but implement the interface" — i.e. exactly
    // `expo-file-system`'s `File`. Using RN's own global fetch with a real
    // `File` appended (or the old pseudo-object with this fetch) both hit
    // unsupported branches there and throw before any request is sent.
    response = await expoFetch(url, {
      ...rest,
      headers,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    await throwForNonOkResponse(response, authOverride);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
}

export interface BinaryResponse {
  data: ArrayBuffer;
  contentType: string | null;
}

/**
 * The binary counterpart to `apiGet` — same base URL, same stored Basic Auth,
 * same 401/`ApiError`/`NetworkError` behavior (via the two helpers above), but
 * NEVER calls `response.json()` on success: a PDF (or any other binary body)
 * would throw there, and even if it didn't, `T` would be meaningless. Callers
 * get the raw `ArrayBuffer` plus the response's `Content-Type` and decide
 * what to do with the bytes themselves.
 */
export async function apiGetBinary(path: string, options?: ApiRequestOptions): Promise<BinaryResponse> {
  const { authOverride, headers: extraHeaders } = options ?? {};
  const url = `${API_BASE_URL}${path}`;
  const headers = await resolveAuthHeaders(authOverride, extraHeaders as Record<string, string> | undefined);

  let response: Response;
  try {
    response = await expoFetch(url, { method: 'GET', headers });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    await throwForNonOkResponse(response, authOverride);
  }

  const data = await response.arrayBuffer();
  return { data, contentType: response.headers.get('content-type') };
}

export async function apiGet<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'PUT', body });
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'PATCH', body });
}

export async function apiDelete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}
