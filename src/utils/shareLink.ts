/**
 * The ONE place that knows the ArkIve share-link shape
 * (`arkive://share/<TOKEN>`) — QR generation, the native share sheet, the
 * deep-link handler, and the QR scanner all go through these two functions
 * rather than building/parsing the URL themselves. This is deliberate: the
 * raw share token is a secret, single-use, expiring credential, and keeping
 * every place that touches its string representation centralized is what
 * makes "never log it, never put it in a query key, never put it in a route
 * param" actually enforceable in practice.
 *
 * Custom scheme only (`arkive://`) — no HTTPS universal link in this phase,
 * confirmed deliberate scope. The link carries ONLY the raw token, never
 * clinical data, never the ArkIve patient ID.
 *
 * `new URL(...)` is deliberately NOT used here: WHATWG URL parsing for a
 * non-special (non-http/https) scheme like `arkive:` has historically
 * inconsistent `host`/`pathname` splitting across JS engines (Hermes
 * included) — a plain, explicit regex is predictable on every platform this
 * app runs on.
 */
const SHARE_SCHEME = 'arkive';
const SHARE_HOST = 'share';
const SHARE_URL_PATTERN = /^arkive:\/\/share\/([^?#]+)/i;

/** Builds `arkive://share/<token>` — the token is the only thing it ever contains. */
export function buildPatientShareUrl(token: string): string {
  return `${SHARE_SCHEME}://${SHARE_HOST}/${encodeURIComponent(token)}`;
}

/**
 * Accepts ONLY `arkive://share/<token>` (case-insensitive scheme/host).
 * Returns the extracted raw token, or `null` for anything else — wrong
 * scheme, wrong host/path, missing token, or any unrelated text (e.g. a
 * random website QR code). Deliberately does NOT validate the token's own
 * format/length beyond "non-empty" — the backend remains the sole authority
 * on whether a given token is a real, current invitation; this parser's only
 * job is recognizing "is this even an ArkIve share link".
 */
export function parsePatientShareUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  const match = SHARE_URL_PATTERN.exec(url.trim());
  if (!match) return null;

  let token = match[1];
  try {
    token = decodeURIComponent(token);
  } catch {
    // Malformed percent-encoding — fall back to the raw captured segment
    // rather than rejecting outright; the backend will reject an invalid
    // token on preview regardless.
  }

  return token.length > 0 ? token : null;
}
