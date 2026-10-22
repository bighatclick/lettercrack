import { addDays, daysBetween, isoWeek, type LocalDate } from './daily';

/**
 * Daily streak with one free freeze per ISO week (specs.md §5, CG-R15).
 * A streak counts dailies solved on their own date. A missed day is bridged automatically by
 * that week's freeze, if it is unused. Restoring a streak is never charged for.
 */
export type StreakState = {
  streak: number;
  best: number;
  /** ISO week in which a freeze was last used. One freeze per week. */
  freezeUsedWeek: string | null;
  /** Dates whose daily was solved on that date. */
  solvedDates: LocalDate[];
  /** Highest local date seen; guards against rewinding the clock. */
  highestDateSeen: LocalDate | null;
};

export const emptyStreak = (): StreakState => ({
  streak: 0,
  best: 0,
  freezeUsedWeek: null,
  solvedDates: [],
  highestDateSeen: null,
});

const lastSolved = (s: StreakState): LocalDate | null =>
  s.solvedDates.reduce<LocalDate | null>((max, d) => (max === null || d > max ? d : max), null);

/**
 * Can the days strictly between `from` and `to` be bridged with freezes?
 * Each ISO week bridges at most one missed day, and not a week whose freeze is already used.
 * Returns the last week used, or `false`.
 */
function bridge(from: LocalDate, to: LocalDate, freezeUsedWeek: string | null): { week: string | null } | false {
  const missed = daysBetween(from, to) - 1;
  if (missed <= 0) return { week: freezeUsedWeek };
  const weeks: string[] = [];
  for (let i = 1; i <= missed; i++) weeks.push(isoWeek(addDays(from, i)));
  if (new Set(weeks).size !== weeks.length) return false; // two missed days in one week
  if (freezeUsedWeek !== null && weeks.includes(freezeUsedWeek)) return false;
  return { week: weeks.at(-1) ?? freezeUsedWeek };
}

export type SolveResult = { state: StreakState; credited: boolean; freezeUsed: boolean };

/**
 * Records a daily solve. Credit only when the daily's date is today, it was not already
 * solved, and the clock has not been wound back below a date already seen.
 * Archive solves (any other date) never change the streak.
 */
export function recordDailySolve(s: StreakState, dailyDate: LocalDate, today: LocalDate): SolveResult {
  const none = { state: s, credited: false, freezeUsed: false };
  if (dailyDate !== today || s.solvedDates.includes(today)) return none;
  if (s.highestDateSeen !== null && today < s.highestDateSeen) return none;

  const last = lastSolved(s);
  let streak = 1;
  let freezeUsedWeek = s.freezeUsedWeek;
  let freezeUsed = false;
  if (last !== null && last < today) {
    const b = bridge(last, today, s.freezeUsedWeek);
    if (b) {
      streak = s.streak + 1;
      freezeUsed = b.week !== s.freezeUsedWeek;
      freezeUsedWeek = b.week;
    }
  }
  const state: StreakState = {
    streak,
    best: Math.max(s.best, streak),
    freezeUsedWeek,
    solvedDates: [...s.solvedDates, today],
    highestDateSeen: today > (s.highestDateSeen ?? '') ? today : s.highestDateSeen,
  };
  return { state, credited: true, freezeUsed };
}

/** Streak to show on Home today: alive if today's or yesterday's daily is solved, or the gap is bridgeable. */
export function displayStreak(s: StreakState, today: LocalDate): number {
  const last = lastSolved(s);
  if (last === null) return 0;
  if (last >= today) return s.streak;
  // Today's daily is still open, so only the days before today must be bridged.
  return bridge(last, today, s.freezeUsedWeek) ? s.streak : 0;
}
