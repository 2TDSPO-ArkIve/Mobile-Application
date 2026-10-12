/**
 * Single authoritative source for the ArkIve API base URL.
 *
 * The URL itself is not a secret, so it may be overridden via the public
 * EXPO_PUBLIC_API_URL env var (e.g. to point a local build at a Spring Boot
 * instance running on a LAN IP). Credentials are never read from env vars —
 * see src/storage/credentialStore.ts for those.
 *
 * If EXPO_PUBLIC_API_URL is set but not a usable URL, this throws at module
 * load rather than silently falling back — a malformed override should fail
 * loudly, not quietly resolve to some other backend.
 */
const ARKIVE_API_BASE_URL = 'https://arkive-b7v2.onrender.com';

function resolveApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!override) {
    return ARKIVE_API_BASE_URL;
  }

  if (!/^https?:\/\/[^\s]+$/i.test(override)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL is set to an invalid value: "${override}". ` +
        'It must be a full http(s) URL. Fix or unset it to use the default ArkIve API.'
    );
  }

  return override.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * The canonical public web host this app is deployed to — confirmed against
 * `vercel.json` (a catch-all SPA rewrite, `/:path*` -> `/`, so ANY path
 * including `/share/<token>` already resolves to the app bundle without any
 * hosting change) and the backend's own CORS allowlist
 * (`SecurityConfig.corsConfigurationSource`), which already trusts this exact
 * origin. Used only to build/validate patient-sharing URLs
 * (`src/utils/shareLink.ts`) — never used for API calls.
 */
const ARKIVE_WEB_BASE_URL = 'https://mobile-application-sooty.vercel.app';

function resolveShareBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_SHARE_BASE_URL?.trim();

  if (!override) {
    return ARKIVE_WEB_BASE_URL;
  }

  if (!/^https?:\/\/[^\s]+$/i.test(override)) {
    throw new Error(
      `EXPO_PUBLIC_SHARE_BASE_URL is set to an invalid value: "${override}". ` +
        'It must be a full http(s) URL. Fix or unset it to use the default ArkIve web host.'
    );
  }

  return override.replace(/\/+$/, '');
}

export const SHARE_BASE_URL = resolveShareBaseUrl();
