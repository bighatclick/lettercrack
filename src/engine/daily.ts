/**
 * Daily quote scheduling (F5). Everything works on the device's local calendar date
 * (`YYYY-MM-DD`), so "today" changes at local midnight in every timezone.
 * Day arithmetic runs on UTC midnights, so DST changes never produce half-days.
 */

export type LocalDate = string;

/**
 * Day 1 of the daily sequence. FROZEN (5 Nov 2026): every player's daily, streak and archive are
 * derived from it forever. Never change it after the first external build. Public release should
 * be on or after this date: before it, every day shows day 1's quote (dailyIndex clamps to 0).
 */
export const LAUNCH_DATE: LocalDate = '2027-01-01';

const DAY_MS = 86_400_000;
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(s: string): boolean {
  const m = RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The calendar date of an instant on the device (or in `timeZone`, an IANA name, when given;
 * the app never passes it, tests do).
 */
export function toLocalDate(d: Date, timeZone?: string): LocalDate {
  if (timeZone) {
    let f = formatters.get(timeZone);
    if (!f) {
      // en-CA formats as YYYY-MM-DD.
      f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
      formatters.set(timeZone, f);
    }
    return f.format(d);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days since 1970-01-01 for a calendar date (timezone-independent). */
export function dayNumber(date: LocalDate): number {
  const m = RE.exec(date);
  if (!m || !isLocalDate(date)) throw new Error(`Invalid local date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

export function fromDayNumber(n: number): LocalDate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export const addDays = (date: LocalDate, n: number): LocalDate => fromDayNumber(dayNumber(date) + n);
export const daysBetween = (from: LocalDate, to: LocalDate): number => dayNumber(to) - dayNumber(from);

/** 0 on launch day. Dates before launch clamp to 0 (dev builds, wrong clocks). */
export function dailyIndex(date: LocalDate, launch: LocalDate = LAUNCH_DATE): number {
  return Math.max(0, daysBetween(launch, date));
}

/**
 * The quote for a date. `order` is the fixed daily order shipped in the asset; it is appended to
 * in updates, never reordered. If the order runs out, it wraps (the pool grows long before that).
 */
export function dailyQuoteId(date: LocalDate, order: readonly number[], launch: LocalDate = LAUNCH_DATE): number {
  if (order.length === 0) throw new Error('daily order is empty');
  return order[dailyIndex(date, launch) % order.length] as number;
}

/** A daily can be played if it is between launch and today. Future dailies never are. */
export function isPlayableDaily(date: LocalDate, today: LocalDate, launch: LocalDate = LAUNCH_DATE): boolean {
  return isLocalDate(date) && date >= launch && date <= today;
}

/** Archive dates, newest first, from yesterday back to launch (today's daily is on Home). */
export function archiveDates(today: LocalDate, launch: LocalDate = LAUNCH_DATE): LocalDate[] {
  const out: LocalDate[] = [];
  for (let n = dayNumber(today) - 1; n >= dayNumber(launch); n--) out.push(fromDayNumber(n));
  return out;
}

/** ISO-8601 week, e.g. `2027-W01`. Weeks start on Monday. Used for the weekly streak freeze. */
export function isoWeek(date: LocalDate): string {
  const n = dayNumber(date);
  const weekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const thursday = n - weekday + 3;
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1) / DAY_MS;
  const week = Math.floor((thursday - jan1) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Highest local date the app has seen. Moving the clock back below it is detected;
 * streak.ts refuses streak credit for dailies "solved" on such rewound dates.
 */
export function noteSeenDate(highestSeen: LocalDate | null, today: LocalDate): LocalDate {
  return highestSeen === null || today > highestSeen ? today : highestSeen;
}
