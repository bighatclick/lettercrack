import { addDays, daysBetween, isoWeek, type LocalDate } from './daily';

/**
 * Daily streak with one free freeze per ISO week (specs.md §5, CG-R15).
 * A streak counts dailies solved on their own date, or started on it and finished the next day
 * (the puzzle you were playing at midnight still counts for its day). A missed day is bridged automatically by
 * that week's freeze, if it is unused, and otherwise by a saved bonus freeze.
 * Bonus freezes are earned at streak milestones (never bought). Restoring a streak is never charged for.
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
  /** Saved freezes earned at milestones; used only after the weekly one. */
  bonusFreezes: number;
  /** Freeze milestones already paid out, so a rebuilt streak can't earn the same one twice. */
  milestonesAwarded: number[];
};

/** Streak lengths Inky celebrates. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
/** Milestones that also earn a saved freeze (once each, ever). */
export const FREEZE_MILESTONES = [7, 30, 100] as const;
export const MAX_BONUS_FREEZES = 3;

export const emptyStreak = (): StreakState => ({
  streak: 0,
  best: 0,
  freezeUsedWeek: null,
  solvedDates: [],
  highestDateSeen: null,
  bonusFreezes: 0,
  milestonesAwarded: [],
});

const lastSolved = (s: StreakState): LocalDate | null =>
  s.solvedDates.reduce<LocalDate | null>((max, d) => (max === null || d > max ? d : max), null);

/**
 * Can the days strictly between `from` and `to` be bridged with freezes?
 * Each ISO week's free freeze bridges one missed day (not a week whose freeze is already used);
 * any other missed day uses a saved bonus freeze. Returns the last week used and the bonus
 * freezes spent, or `false`.
 */
function bridge(
  from: LocalDate,
  to: LocalDate,
  freezeUsedWeek: string | null,
  bonus: number,
): { week: string | null; bonusUsed: number } | false {
  const missed = daysBetween(from, to) - 1;
  const used = new Set<string>(freezeUsedWeek ? [freezeUsedWeek] : []);
  let week = freezeUsedWeek;
  let bonusUsed = 0;
  for (let i = 1; i <= missed; i++) {
    const w = isoWeek(addDays(from, i));
    if (!used.has(w)) {
      used.add(w);
      week = w;
    } else if (bonusUsed < bonus) {
      bonusUsed += 1;
    } else {
      return false;
    }
  }
  return { week, bonusUsed };
}

export type SolveResult = {
  state: StreakState;
  credited: boolean;
  freezeUsed: boolean;
  /** The streak length just reached, when it is one of STREAK_MILESTONES. */
  milestone: number | null;
  /** A bonus freeze was earned by this solve. */
  freezeEarned: boolean;
};

/**
 * Records a daily solve. Credit only when the daily's date is today, it was not already
 * solved, and the clock has not been wound back below a date already seen.
 * Also credited for its own date: yesterday's daily that was started yesterday (`startedOnDay`,
 * checked against the rewound-clock guard when it was opened), while today's isn't solved yet.
 * Archive solves (any other date) never change the streak.
 */
export function recordDailySolve(
  s: StreakState,
  dailyDate: LocalDate,
  today: LocalDate,
  startedOnDay = false,
): SolveResult {
  const none = { state: s, credited: false, freezeUsed: false, milestone: null, freezeEarned: false };
  const overMidnight = startedOnDay && dailyDate === addDays(today, -1) && !s.solvedDates.some((d) => d >= dailyDate);
  if ((dailyDate !== today && !overMidnight) || s.solvedDates.includes(dailyDate)) return none;
  if (!overMidnight && s.highestDateSeen !== null && today < s.highestDateSeen) return none;

  // The day being credited: today, or yesterday for a daily finished just after midnight.
  const day = dailyDate;
  const last = lastSolved(s);
  let streak = 1;
  let freezeUsedWeek = s.freezeUsedWeek;
  let bonusFreezes = s.bonusFreezes;
  let freezeUsed = false;
  if (last !== null && last < day) {
    const b = bridge(last, day, s.freezeUsedWeek, bonusFreezes);
    if (b) {
      streak = s.streak + 1;
      freezeUsed = b.week !== s.freezeUsedWeek || b.bonusUsed > 0;
      freezeUsedWeek = b.week;
      bonusFreezes -= b.bonusUsed;
    }
  }
  const awarded = [...s.milestonesAwarded];
  let freezeEarned = false;
  for (const m of FREEZE_MILESTONES) {
    if (streak >= m && !awarded.includes(m)) {
      awarded.push(m);
      if (bonusFreezes < MAX_BONUS_FREEZES) {
        bonusFreezes += 1;
        freezeEarned = true;
      }
    }
  }
  const state: StreakState = {
    streak,
    best: Math.max(s.best, streak),
    freezeUsedWeek,
    solvedDates: [...s.solvedDates, day],
    highestDateSeen: today > (s.highestDateSeen ?? '') ? today : s.highestDateSeen,
    bonusFreezes,
    milestonesAwarded: awarded,
  };
  const milestone = (STREAK_MILESTONES as readonly number[]).includes(streak) ? streak : null;
  return { state, credited: true, freezeUsed, milestone, freezeEarned };
}

/** Streak to show on Home today: alive if today's or yesterday's daily is solved, or the gap is bridgeable. */
export function displayStreak(s: StreakState, today: LocalDate): number {
  const last = lastSolved(s);
  if (last === null) return 0;
  if (last >= today) return s.streak;
  // Today's daily is still open, so only the days before today must be bridged.
  return bridge(last, today, s.freezeUsedWeek, s.bonusFreezes) ? s.streak : 0;
}
