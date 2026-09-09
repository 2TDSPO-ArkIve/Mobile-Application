/**
 * Pure date/time helpers for scheduling a NEW consultation — extracted out
 * of `NewConsultaScreen.tsx` so the local-wall-clock comparison at the heart
 * of the "same-day future time" validation is independently inspectable
 * (the project has no test runner configured; this keeps the logic pure and
 * injectable enough to verify by hand or from a future test suite without
 * needing to mock `Date` globally).
 *
 * CONFIRMED SAFE: every function here builds `Date` values exclusively from
 * numeric LOCAL components (`getFullYear`/`getMonth`/`getDate`/`getHours`/
 * `getMinutes` in, the same constructor args out) — never `new Date("YYYY-MM-DD")`
 * (parsed as UTC by the JS spec, off by the local UTC offset) and never
 * `toISOString()` for anything that must stay a local wall-clock value. The
 * outgoing `dataHora` string built here is exactly what `ConsultaRequest`
 * (`java-advanced`) expects: a plain `YYYY-MM-DDTHH:mm:ss`, unsuffixed —
 * `LocalDateTime`, not an `Instant`/`OffsetDateTime` — so there is
 * deliberately no `Z`/offset appended here, ever.
 */

/** Combines `date`'s calendar day with `time`'s hour/minute — both read via local getters, so this is a pure function of what the veterinarian actually picked on the device, in the device's own timezone. Seconds/ms are always zeroed (the UI only ever offers minute precision). */
export function combineLocalDateTime(date: Date, time: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0, 0);
}

/**
 * Compares at minute precision (seconds zeroed on both sides of the
 * comparison) so a handful of seconds elapsing between picking a time and
 * tapping "Criar consulta" never turns a value the veterinarian legitimately
 * chose as "now" into a false rejection. `now` is injectable so this is
 * testable without mocking global `Date`; production call sites simply omit
 * it and get the real current local time.
 *
 * Matches the task's own prescribed rule exactly:
 *   selected local wall-clock minute <  current local wall-clock minute -> invalid
 *   selected local wall-clock minute >= current local wall-clock minute -> valid
 */
export function isScheduleInPast(date: Date, time: Date, now: Date = new Date()): boolean {
  const combined = combineLocalDateTime(date, time);
  const flooredNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  return combined.getTime() < flooredNow.getTime();
}

/** Today at local midnight — the earliest selectable date for a new consultation. `now` injectable for the same reason as `isScheduleInPast`. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Builds the exact `LocalDateTime` string Spring expects — local wall-clock
 * time, zero-padded, no timezone/UTC conversion (`ConsultaRequest.dataHora`
 * is a `LocalDateTime`, not an `Instant`/`OffsetDateTime`).
 */
export function toLocalDateTimeString(date: Date, time: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}
