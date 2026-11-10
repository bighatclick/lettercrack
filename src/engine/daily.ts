/**
 * Daily quote scheduling (F5). Everything works on the device's local calendar date
 * (`YYYY-MM-DD`), so "today" changes at local midnight in every timezone.
 * Day arithmetic runs on UTC midnights, so DST changes never produce half-days.
 */

export type LocalDate = string;

/**
 * Day 1 of the daily quote order: which quote every player gets on a date, and the daily number.
 * It is NOT a release date (release can be any day): it only has to be on or before the first day
 * anyone plays, so it is in the past. FROZEN (10 Nov 2026): never change it after the first
 * external build. It is a Friday like the builder's slot 0 (tools/quotes/build.mjs DAILY_EPOCH),
 * so Sunday-special slots land on Sundays. Each player's archive starts on their own first day
 * (see `dailyStart` in src/game/archive.ts), not here.
 */
export const DAILY_EPOCH: LocalDate = '2026-10-30';

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

/** 0 on the epoch. Dates before it clamp to 0 (wrong clocks). */
export function dailyIndex(date: LocalDate, epoch: LocalDate = DAILY_EPOCH): number {
  return Math.max(0, daysBetween(epoch, date));
}

/**
 * The quote for a date. `order` is the fixed daily order shipped in the asset; it is appended to
 * in updates, never reordered. If the order runs out, it wraps (the pool grows long before that).
 */
export function dailyQuoteId(date: LocalDate, order: readonly number[], epoch: LocalDate = DAILY_EPOCH): number {
  if (order.length === 0) throw new Error('daily order is empty');
  return order[dailyIndex(date, epoch) % order.length] as number;
}

/** A daily can be played if it is between the epoch and today. Future dailies never are. */
export function isPlayableDaily(date: LocalDate, today: LocalDate, epoch: LocalDate = DAILY_EPOCH): boolean {
  return isLocalDate(date) && date >= epoch && date <= today;
}

/** Archive dates, newest first, from yesterday back to `start` (today's daily is on Home). */
export function archiveDates(today: LocalDate, start: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let n = dayNumber(today) - 1; n >= dayNumber(start); n--) out.push(fromDayNumber(n));
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
