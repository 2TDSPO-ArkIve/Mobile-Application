import { apiPost, apiDelete } from './apiClient';

/** `PlataformaDispositivo.java` — confirmed exactly these two values. Java rejects anything else (including `"WEB"`, which does not exist in the enum) at JSON deserialization. */
export type DevicePlatform = 'ANDROID' | 'IOS';

/** `RegistrarDispositivoRequest.java` — confirmed field-for-field. `expoPushToken` must match Java's own `^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+]$` pattern or the request is rejected (400) before ever reaching the service. */
export interface RegisterDeviceInput {
  expoPushToken: string;
  platform: DevicePlatform;
  /** A stable, app-install-scoped identifier (never a credential) — see `STORAGE_KEYS.pushInstallationId`'s own note. Java upserts by `(usuarioId, installationId)` first, then by token. */
  installationId: string;
}

/** `UsuarioDispositivoResponse.java` — confirmed field-for-field. Deliberately does NOT echo back `expoPushToken`. */
export interface DeviceRegistrationDto {
  id: number;
  platform: DevicePlatform;
  installationId: string;
  createdAt: string;
  lastSeenAt: string;
  active: boolean;
  revokedAt: string | null;
}

/**
 * `POST /api/notificacoes/dispositivos` — confirmed `UsuarioDispositivoController.registrar`,
 * `201 Created`. Scoped entirely to the authenticated principal server-side;
 * this app never sends a user/account id of its own. Can return `409
 * Conflict` if the token is already bound to a different installation/
 * account — the caller must treat that as a real failure, never retry blindly.
 */
export async function registerDevice(input: RegisterDeviceInput): Promise<DeviceRegistrationDto> {
  return apiPost<DeviceRegistrationDto>('/api/notificacoes/dispositivos', input);
}

/**
 * `DELETE /api/notificacoes/dispositivos/{id}` — confirmed
 * `UsuarioDispositivoController.desativar`, `204 No Content`. `id` is the
 * device registration's OWN id (`DeviceRegistrationDto.id`), not the Expo
 * token or installationId. Scoped to the authenticated principal
 * server-side — this app never attempts to deactivate another account's
 * device registration, and in practice only ever calls this for a
 * registration it itself created and stored locally.
 */
export async function deactivateDevice(id: number): Promise<void> {
  await apiDelete<void>(`/api/notificacoes/dispositivos/${id}`);
}
