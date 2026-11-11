/**
 * A `Date` constructor whose "now" is the real clock plus an offset. Pure: no storage, no React.
 * Used only by the E2E test clock (`clock.ts`), because the iOS simulator's clock can't be moved.
 *
 * - `new Date()` and `Date.now()` are shifted; the clock keeps ticking, so waiting past midnight works.
 * - `new Date(x)` and every other form are untouched, so stored timestamps and parsing are exact.
 * - Instances are real `Date`s (`instanceof Date` holds), so libraries see nothing unusual.
 */
export function makeShiftedDate(Real: DateConstructor, offsetMs: () => number): DateConstructor {
  function ShiftedDate(this: unknown, ...args: unknown[]): Date | string {
    // Called without `new`, Date returns a string for "now".
    if (!new.target) return new Real(Real.now() + offsetMs()).toString();
    if (args.length === 0) return new Real(Real.now() + offsetMs());
    return new (Real as unknown as new (...a: unknown[]) => Date)(...args);
  }
  ShiftedDate.prototype = Real.prototype;
  ShiftedDate.now = () => Real.now() + offsetMs();
  ShiftedDate.parse = Real.parse;
  ShiftedDate.UTC = Real.UTC;
  return ShiftedDate as unknown as DateConstructor;
}

/** "2027-01-10T10:00:00" (device-local time, seconds optional) → ms, or null if malformed. */
export function parseLocalDateTime(Real: DateConstructor, at: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(at);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map((v) => Number(v ?? 0)) as [number, number, number, number, number, number];
  const t = new Real(y, mo - 1, d, h, mi, s);
  // Reject dates that rolled over (2027-02-30 → 2 March).
  if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) return null;
  return t.getTime();
}
