import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../context/ThemeContext';
import { presentLocalNotification } from '../utils/localNotifications';
import { hasStoredPushRegistration } from '../utils/pushRegistration';
import { DEFAULT_NOTIFICATIONS_PAGE_SIZE, type NotificationDto } from '../services/notificationService';

/** Same cadence as the header badge's own poll — no separate/faster interval needed for this. */
const POLL_MS = 30_000;

interface Cursor {
  createdAt: string;
  id: number;
}

/**
 * Java serializes `createdAt` as a plain `LocalDateTime` ISO string (no
 * zone/offset — the same shape this app already parses everywhere else, e.g.
 * `ConsultaDto.dataHora` via `new Date(dataHora)`). `LocalDateTime`'s default
 * `ISO_LOCAL_DATE_TIME` formatting OMITS the seconds/fractional-second
 * component entirely when they're exactly zero (e.g. a timestamp landing on
 * a whole minute serializes as `"...T14:30"`, not `"...T14:30:00"`) — a
 * variable-length suffix that plain lexicographic string comparison likely
 * still handles correctly in practice, but not with enough certainty to
 * trust blindly for a correctness-sensitive baseline. Parsing both sides via
 * `new Date(...)` and comparing `getTime()` removes that doubt entirely,
 * costs nothing extra, and matches the task's own fallback guidance. `id` is
 * still the deterministic tie-breaker on an exact timestamp match.
 */
function toEpochMillis(createdAt: string): number {
  return new Date(createdAt).getTime();
}

/**
 * A notification is genuinely newer than `cursor` when its parsed
 * `createdAt` is later, or — on an exact timestamp tie — its `id` is higher.
 * `cursor === null` means no baseline has been established yet (nothing has
 * ever been observed this session), so anything is considered new. Never
 * uses `Date.now()`/any client-clock value — both sides of every comparison
 * are server-provided `createdAt`s.
 */
function isNewerThanCursor(candidate: { createdAt: string; id: number }, cursor: Cursor | null): boolean {
  if (!cursor) return true;
  const candidateTime = toEpochMillis(candidate.createdAt);
  const cursorTime = toEpochMillis(cursor.createdAt);
  if (candidateTime !== cursorTime) return candidateTime > cursorTime;
  return candidate.id > cursor.id;
}

/**
 * Non-visual, mounted once in `App.tsx` INSIDE `AuthProvider` (unlike
 * `DeepLinkHandler`, which must sit above it) — this needs `useAuth()` to
 * gate polling to an authenticated session.
 *
 * Bridges the polling-based in-app notification system to a native OS local
 * notification: when a poll of unread notifications turns up a row that is
 * genuinely newer than the established HIGH-WATER-MARK cursor, it presents
 * exactly one local notification using that row's own `title`/`message` —
 * never fabricated content, never a different notification type than what
 * Java actually created.
 *
 * CURSOR, not a bare "unseen id" check: the backend returns this list sorted
 * `createdAt DESC, id DESC` (confirmed ordering invariant), so `data[0]` is
 * always the single most-recent unread row across the WHOLE backlog, not
 * just this page. An id-only "have I seen this before" check breaks under
 * pagination — if an account has more unread notifications than one page
 * holds, an OLD row (created long before this session even started) can
 * later shift into page 0 purely because newer rows ahead of it got marked
 * read, and its id would never have been "seen" before. Comparing its
 * `createdAt`/`id` against the cursor correctly recognizes it as OLD and
 * suppresses it, regardless of when its id was first observed.
 *
 * `cursorRef` starts `null` ("no baseline yet"). The FIRST successful poll
 * after mount/login sets it to the newest row's `{createdAt, id}` WITHOUT
 * notifying for anything in that poll — otherwise a brand-new session with,
 * say, 15 pre-existing unread notifications would fire 15 OS notifications
 * at once.
 *
 * HIGH-WATER MARK, never regresses: every poll after the first only notifies
 * for rows newer than the CURRENT cursor, then advances the cursor to
 * `max(currentCursor, data[0])` — i.e. it only moves forward, and only when
 * `data[0]` (this poll's newest row) is actually newer than what's already
 * stored. Example: unread = [A(newest), B, C], cursor becomes A. A gets read
 * and drops out of the unread list; the next poll's `data[0]` is B, which is
 * OLDER than A — the cursor stays at A, it does NOT regress to B. If it did
 * regress, the cursor would stop meaning "the newest server notification
 * we've ever observed" and could let a genuinely-older row slip back in as
 * "new" after a later read/unread shuffle. If a poll's unread result is
 * EMPTY (everything got read), the cursor is left exactly as it was — there
 * is no `data[0]` to compare, and resetting it would throw away the
 * baseline for no reason; a future new notification still correctly
 * compares against the last-known server high-water mark.
 *
 * `seenIdsRef` is kept only as an EXTRA duplicate guard (e.g. against the
 * same row appearing in two overlapping poll results) — the cursor
 * comparison above is the sole source of truth for "is this new", never bare
 * id novelty.
 *
 * Resets both the cursor and the seen-id guard whenever auth status leaves
 * `authenticated` (logout, or a 401-triggered sign-out), so a second account
 * logging in on the same device/session doesn't get compared against the
 * previous account's notifications. This is deliberately in-memory only (a
 * `useRef`, never persisted) — a page reload or app restart re-establishing
 * a fresh baseline is the accepted, simple behavior called for here, not a
 * bug to engineer around.
 */
export function NotificationBridge(): null {
  const { status } = useAuth();
  const { preferences } = useTheme();
  const cursorRef = useRef<Cursor | null>(null);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<number>>(new Set());

  // Same "no pagination UI yet, request an explicit bounded page" rationale
  // as NotificationsScreen — see DEFAULT_NOTIFICATIONS_PAGE_SIZE's own note.
  const { data } = useNotifications(
    { naoLidas: true, page: 0, size: DEFAULT_NOTIFICATIONS_PAGE_SIZE },
    { refetchInterval: POLL_MS }
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      cursorRef.current = null;
      initializedRef.current = false;
      seenIdsRef.current = new Set();
    }
  }, [status]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!preferences.pushEnabled) return;
    if (status !== 'authenticated') return;
    if (!data) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (data.length > 0) {
        const newest = data[0];
        cursorRef.current = { createdAt: newest.createdAt, id: newest.id };
        data.forEach((notification) => seenIdsRef.current.add(notification.id));
      }
      return;
    }

    const cursor = cursorRef.current;
    const newOnes: NotificationDto[] = [];

    for (const notification of data) {
      if (seenIdsRef.current.has(notification.id)) continue;
      if (!isNewerThanCursor(notification, cursor)) continue;
      seenIdsRef.current.add(notification.id);
      newOnes.push(notification);
    }

    // High-water mark: cursor = max(cursor, newest row observed this poll).
    // `data[0]` is this poll's newest row (per the backend's own
    // `createdAt DESC, id DESC` ordering — no need to re-derive it by
    // scanning). Only ever advances, and an empty `data` this poll leaves
    // the cursor untouched entirely (nothing to compare).
    if (data.length > 0 && isNewerThanCursor(data[0], cursor)) {
      cursorRef.current = { createdAt: data[0].createdAt, id: data[0].id };
    }

    if (newOnes.length === 0) return;

    // Chunk 5 — if this device has an active remote-push registration, a
    // real Expo push may ALSO arrive for the same backend event (whenever an
    // operator enables `arkive.push.expo.enabled` server-side); presenting a
    // local one too would double the OS banner for one event. This is a
    // cheap LOCAL storage read, never a network round-trip, and is
    // deliberately re-checked per poll rather than cached across the
    // component's lifetime — the Settings toggle can flip registration on/
    // off at any time.
    void (async () => {
      const remoteRegistered = await hasStoredPushRegistration();
      if (remoteRegistered) return;
      for (const notification of newOnes) {
        void presentLocalNotification(notification.title, notification.message, {
          notificationId: notification.id,
          type: notification.type,
          animalId: notification.animalId,
          resourceType: notification.resourceType,
          resourceId: notification.resourceId,
        });
      }
    })();
  }, [data, status, preferences.pushEnabled]);

  return null;
}
