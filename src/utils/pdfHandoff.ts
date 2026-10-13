import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/**
 * Generic, PDF-content-agnostic platform hand-off — extracted from
 * `useConsultaResumoPdf.ts` (the consultation-summary PDF export) so the
 * patient-history PDF export (`usePatientHistoryPdf.ts`) can reuse the exact
 * same native-share/web-download behavior without duplicating it. Pure move,
 * no behavior change: both callers already relied on exactly this.
 *
 * Never persists the bytes beyond the immediate action — no AsyncStorage, no
 * SecureStore, no TanStack Query cache — matching every PDF-export endpoint's
 * own `Cache-Control: no-store`.
 */

/** Writes into the app's cache directory (not document directory) — a throwaway export artifact, not app data worth keeping. */
function writeToCacheFile(bytes: Uint8Array<ArrayBuffer>, filename: string): File {
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}

/** Best-effort — a leftover temp PDF in the cache dir is not a correctness problem; the OS can reclaim it. */
function cleanupFile(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    /* best-effort */
  }
}

async function shareOnNative(bytes: Uint8Array<ArrayBuffer>, filename: string): Promise<void> {
  const file = writeToCacheFile(bytes, filename);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    cleanupFile(file);
    throw new Error('Sharing is not available on this device.');
  }

  try {
    // Never delete before this resolves — the share sheet reads the file
    // from disk while it's open (and possibly for as long as the user takes
    // to pick a target app), so deleting earlier would corrupt the share.
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
  } finally {
    cleanupFile(file);
  }
}

function shareOnWeb(bytes: Uint8Array<ArrayBuffer>, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Hands off already-downloaded PDF bytes to the user — native share sheet, or a web browser download. */
export async function sharePdfBytes(bytes: Uint8Array<ArrayBuffer>, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    shareOnWeb(bytes, filename);
    return;
  }
  await shareOnNative(bytes, filename);
}

// eslint-disable-next-line no-misleading-character-class -- intentional: matches NFD combining diacritics (U+0300-U+036F) to strip accents below.
const COMBINING_DIACRITICS_PATTERN = /[̀-ͯ]/g;
const FILENAME_UNSAFE_PATTERN = /[^a-z0-9]+/g;

/**
 * `thor` from `"Thór"` — accent-stripped, lowercased, non-alphanumeric runs
 * collapsed to `-`, leading/trailing `-` trimmed. Returns `''` (never `-`)
 * when `value` is absent or normalizes to nothing (e.g. punctuation/emoji
 * only), so callers can cleanly fall back to an id-based filename.
 */
export function slugifyFilenamePart(value?: string | null): string {
  return (
    value
      ?.normalize('NFD')
      .replace(COMBINING_DIACRITICS_PATTERN, '')
      .toLowerCase()
      .replace(FILENAME_UNSAFE_PATTERN, '-')
      .replace(/^-+|-+$/g, '') ?? ''
  );
}
