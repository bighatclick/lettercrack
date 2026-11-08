/**
 * Badges: earned once, kept forever (a later broken streak never takes one away).
 * "State" badges follow from lifetime facts and can be checked at any time (so existing
 * players get theirs on first launch); "moment" badges come from a single solve.
 * No badge is bought, and none asks for anything but playing.
 */
import type { LocalDate } from './daily';

export type BadgeFacts = {
  solves: number;
  clean: number;
  /** XP: letters decoded across solved quotes. */
  letters: number;
  hardSolves: number;
  expertSolves: number;
  bestStreak: number;
  /** Dailies solved (on the day or later from the archive). */
  dailies: number;
  archiveSolves: number;
  /** ISO weeks with all seven dailies solved on their own day. */
  perfectWeeks: number;
  authors: number;
  setsDone: number;
  chaptersDone: number;
  monthMedals: number;
  sundays: number;
};

/** One solve, for the moment badges. */
export type BadgeMoment = {
  /** Local hour of the solve, 0–23. */
  hour: number;
  letters: number;
  clean: boolean;
  /** All of today's goals were finished by this solve. */
  goalsDone: boolean;
};

type Def = { id: string; group: BadgeGroup; test: (f: BadgeFacts) => boolean } | { id: string; group: BadgeGroup; moment: (m: BadgeMoment) => boolean };
export type BadgeGroup = 'solving' | 'skill' | 'streak' | 'collecting' | 'moments';

/** A "marathon" quote has at least this many letters. */
export const MARATHON_LETTERS = 100;

const DEFS: Def[] = [
  { id: 'first_solve', group: 'solving', test: (f) => f.solves >= 1 },
  { id: 'solves_10', group: 'solving', test: (f) => f.solves >= 10 },
  { id: 'solves_50', group: 'solving', test: (f) => f.solves >= 50 },
  { id: 'solves_100', group: 'solving', test: (f) => f.solves >= 100 },
  { id: 'solves_250', group: 'solving', test: (f) => f.solves >= 250 },
  { id: 'letters_1000', group: 'solving', test: (f) => f.letters >= 1000 },
  { id: 'letters_5000', group: 'solving', test: (f) => f.letters >= 5000 },
  { id: 'letters_20000', group: 'solving', test: (f) => f.letters >= 20000 },
  { id: 'first_clean', group: 'skill', test: (f) => f.clean >= 1 },
  { id: 'clean_10', group: 'skill', test: (f) => f.clean >= 10 },
  { id: 'clean_50', group: 'skill', test: (f) => f.clean >= 50 },
  { id: 'hard_first', group: 'skill', test: (f) => f.hardSolves >= 1 },
  { id: 'expert_first', group: 'skill', test: (f) => f.expertSolves >= 1 },
  { id: 'expert_10', group: 'skill', test: (f) => f.expertSolves >= 10 },
  { id: 'daily_first', group: 'streak', test: (f) => f.dailies >= 1 },
  { id: 'dailies_30', group: 'streak', test: (f) => f.dailies >= 30 },
  { id: 'streak_3', group: 'streak', test: (f) => f.bestStreak >= 3 },
  { id: 'streak_7', group: 'streak', test: (f) => f.bestStreak >= 7 },
  { id: 'streak_30', group: 'streak', test: (f) => f.bestStreak >= 30 },
  { id: 'streak_100', group: 'streak', test: (f) => f.bestStreak >= 100 },
  { id: 'streak_365', group: 'streak', test: (f) => f.bestStreak >= 365 },
  { id: 'perfect_week', group: 'streak', test: (f) => f.perfectWeeks >= 1 },
  { id: 'archive_first', group: 'collecting', test: (f) => f.archiveSolves >= 1 },
  { id: 'authors_10', group: 'collecting', test: (f) => f.authors >= 10 },
  { id: 'authors_25', group: 'collecting', test: (f) => f.authors >= 25 },
  { id: 'set_first', group: 'collecting', test: (f) => f.setsDone >= 1 },
  { id: 'chapter_1', group: 'collecting', test: (f) => f.chaptersDone >= 1 },
  { id: 'chapter_5', group: 'collecting', test: (f) => f.chaptersDone >= 5 },
  { id: 'month_medal', group: 'collecting', test: (f) => f.monthMedals >= 1 },
  { id: 'sunday_first', group: 'collecting', test: (f) => f.sundays >= 1 },
  { id: 'sundays_4', group: 'collecting', test: (f) => f.sundays >= 4 },
  { id: 'night_owl', group: 'moments', moment: (m) => m.hour >= 22 || m.hour < 4 },
  { id: 'early_bird', group: 'moments', moment: (m) => m.hour >= 5 && m.hour < 7 },
  { id: 'marathon', group: 'moments', moment: (m) => m.letters >= MARATHON_LETTERS },
  { id: 'marathon_clean', group: 'moments', moment: (m) => m.letters >= MARATHON_LETTERS && m.clean },
  { id: 'goals_all', group: 'moments', moment: (m) => m.goalsDone },
];

export const BADGE_IDS: readonly string[] = DEFS.map((d) => d.id);
export const BADGE_GROUPS: readonly BadgeGroup[] = ['solving', 'skill', 'streak', 'collecting', 'moments'];
export const badgeGroup = (id: string): BadgeGroup | undefined => DEFS.find((d) => d.id === id)?.group;
export const badgesIn = (group: BadgeGroup): string[] => DEFS.filter((d) => d.group === group).map((d) => d.id);

/** Badge id → local date it was earned. */
export type Earned = Record<string, LocalDate>;

/**
 * Adds every badge the facts (and, when given, this solve) now qualify for. Returns the same
 * object when nothing is new, so callers can skip a write.
 */
export function awardBadges(earned: Earned, today: LocalDate, facts: BadgeFacts, moment?: BadgeMoment): { earned: Earned; fresh: string[] } {
  const fresh: string[] = [];
  for (const d of DEFS) {
    if (earned[d.id]) continue;
    const ok = 'test' in d ? d.test(facts) : moment ? d.moment(moment) : false;
    if (ok) fresh.push(d.id);
  }
  if (fresh.length === 0) return { earned, fresh };
  const next = { ...earned };
  for (const id of fresh) next[id] = today;
  return { earned: next, fresh };
}

/** Sync merge: union; when both have a badge, keep the earlier date. */
export function mergeEarned(a: Earned, b: Earned): Earned {
  const out: Earned = { ...a };
  for (const [id, date] of Object.entries(b)) {
    if (typeof date !== 'string') continue;
    const mine = out[id];
    if (!mine || date < mine) out[id] = date;
  }
  return out;
}
