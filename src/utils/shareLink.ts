import { SHARE_BASE_URL } from '../config/api';

/**
 * The ONE place that knows the ArkIve share-link shape — QR generation, the
 * native/web share action, the deep-link/browser-entry handler, the QR
 * scanner, and the manual invitation-code screen all go through these two
 * functions rather than building/parsing the URL themselves. This is
 * deliberate: the raw share token is a secret, single-use, expiring
 * credential, and keeping every place that touches its string representation
 * centralized is what makes "never log it, never put it in a query key,
 * never put it in a route param" actually enforceable in practice.
 *
 * Canonical format is a URL *fragment* —
 * `<SHARE_BASE_URL>/#share=<token>` — not a path segment. A browser never
 * sends the fragment portion of a URL in the HTTP request line (it's parsed
 * client-side only), so the raw token never reaches Vercel's/any CDN's
 * request logs on the initial navigation. This supersedes the earlier
 * `/share/<token>` path-based canonical form for exactly that reason — the
 * path form DID leave the token in the server-side request, even though the
 * app itself scrubbed it from the visible address bar a moment later.
 *
 * `parsePatientShareUrl` still recognizes, for backward compatibility only
 * (old already-printed QR codes/links, never generated anymore):
 * - the previous HTTPS path form `<host>/share/<token>`
 * - the legacy custom-scheme form `arkive://share/<token>`
 *
 * The link carries ONLY the raw token, never clinical data, never the ArkIve
 * patient ID.
 */
const SHARE_FRAGMENT_PREFIX = 'share=';
const LEGACY_SHARE_PATH_PREFIX = '/share/';
const LEGACY_SCHEME_PATTERN = /^arkive:\/\/share\/([^?#]+)/i;

/** Builds `<SHARE_BASE_URL>/#share=<token>` — the token is the only thing it ever contains, and it never leaves the browser as part of the HTTP request. */
export function buildPatientShareUrl(token: string): string {
  return `${SHARE_BASE_URL}/#${SHARE_FRAGMENT_PREFIX}${encodeURIComponent(token)}`;
}

/**
 * Accepts the canonical `https://<configured-share-host>/#share=<token>`
 * fragment form (host must match `SHARE_BASE_URL` exactly — rejects some
 * other website's URL even if it happens to have a matching fragment), the
 * previous HTTPS path form `<host>/share/<token>`, and the legacy
 * `arkive://share/<token>` scheme — all for backward compatibility; only the
 * fragment form is ever generated now.
 *
 * Returns the extracted raw token, or `null` for anything else — wrong
 * host/path/fragment, missing token, or any unrelated text (e.g. a random
 * website QR code). Deliberately does NOT validate the token's own
 * format/length beyond "non-empty" — the backend remains the sole authority
 * on whether a given token is a real, current invitation; this parser's only
 * job is recognizing "is this even an ArkIve share link".
 */
export function parsePatientShareUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();

  const httpsToken = parseCanonicalShareUrl(trimmed);
  if (httpsToken) return httpsToken;

  const legacyMatch = LEGACY_SCHEME_PATTERN.exec(trimmed);
  if (legacyMatch) return decodeToken(legacyMatch[1]);

  return null;
}

function parseCanonicalShareUrl(trimmed: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  let shareHost: URL;
  try {
    shareHost = new URL(SHARE_BASE_URL);
  } catch {
    return null;
  }
  if (parsed.host.toLowerCase() !== shareHost.host.toLowerCase()) return null;

  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  if (fragment.toLowerCase().startsWith(SHARE_FRAGMENT_PREFIX)) {
    return decodeToken(fragment.slice(SHARE_FRAGMENT_PREFIX.length));
  }

  // Backward compatibility: the previous HTTPS canonical form was a path
  // segment, not a fragment.
  if (parsed.pathname.toLowerCase().startsWith(LEGACY_SHARE_PATH_PREFIX)) {
    const rawToken = parsed.pathname.slice(LEGACY_SHARE_PATH_PREFIX.length).split('/')[0];
    return decodeToken(rawToken);
  }

  return null;
}

function decodeToken(raw: string): string | null {
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding — fall back to the raw captured segment
    // rather than rejecting outright; the backend will reject an invalid
    // token on preview regardless.
  }
  return token.length > 0 ? token : null;
}
