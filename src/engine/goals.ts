import type { LocalDate } from './daily';
import type { Difficulty } from './puzzle';
import { createRng, shuffle } from './rng';

/**
 * Daily goals: three small goals a day, the same for everyone on a date (seeded by it).
 * Finishing all three earns one hint. Goals reset each local day; there is no countdown,
 * no penalty for missing them and nothing carries over.
 */
export type GoalId = 'daily' | 'levels2' | 'levels3' | 'clean' | 'hard' | 'letters150' | 'long';

export const GOAL_TARGETS: Record<GoalId, number> = {
  daily: 1,
  levels2: 2,
  levels3: 3,
  clean: 1,
  hard: 1,
  letters150: 150,
  long: 1,
};

/** A "long" quote has at least this many letters. */
export const LONG_QUOTE_LETTERS = 60;
/** Hints granted for finishing all of a day's goals. */
export const GOALS_REWARD_HINTS = 1;

export type GoalsState = {
  /** The day `progress` belongs to. Another day's progress counts as empty. */
  date: LocalDate | null;
  /** GoalId → amount done today. */
  progress: Record<string, number>;
  /** The reward for this day has been granted. */
  rewarded: boolean;
};

export const emptyGoals = (): GoalsState => ({ date: null, progress: {}, rewarded: false });

const EXTRA: readonly GoalId[] = ['levels2', 'levels3', 'clean', 'hard', 'letters150', 'long'];

/** Today's daily is always first; two more come from the pool (never both level-count goals). */
export function goalsFor(date: LocalDate): GoalId[] {
  const picked: GoalId[] = [];
  for (const g of shuffle(EXTRA, createRng(`goals:${date}`))) {
    if (picked.length === 2) break;
    if ((g === 'levels2' && picked.includes('levels3')) || (g === 'levels3' && picked.includes('levels2'))) continue;
    picked.push(g);
  }
  return ['daily', ...picked];
}

export type SolveEvent = {
  mode: 'daily' | 'level';
  /** A daily solved on its own date. */
  dailyToday: boolean;
  clean: boolean;
  difficulty: Difficulty;
  /** A–Z letters in the quote. */
  letters: number;
};

export type GoalView = { id: GoalId; target: number; value: number; done: boolean };

const current = (g: GoalsState, today: LocalDate): GoalsState => (g.date === today ? g : { date: today, progress: {}, rewarded: false });

export function goalProgress(g: GoalsState, today: LocalDate): GoalView[] {
  const s = current(g, today);
  return goalsFor(today).map((id) => {
    const target = GOAL_TARGETS[id];
    const value = Math.min(target, s.progress[id] ?? 0);
    return { id, target, value, done: value >= target };
  });
}

function gain(id: GoalId, ev: SolveEvent): number {
  switch (id) {
    case 'daily':
      return ev.dailyToday ? 1 : 0;
    case 'levels2':
    case 'levels3':
      return ev.mode === 'level' ? 1 : 0;
    case 'clean':
      return ev.clean ? 1 : 0;
    case 'hard':
      return ev.difficulty === 'hard' || ev.difficulty === 'expert' ? 1 : 0;
    case 'letters150':
      return ev.letters;
    case 'long':
      return ev.letters >= LONG_QUOTE_LETTERS ? 1 : 0;
  }
}

export type GoalsResult = {
  state: GoalsState;
  /** Goals that became done with this solve. */
  completed: GoalId[];
  /** All of today's goals are now done and the reward was granted by this solve. */
  rewardNow: boolean;
};

/** Counts a solve toward today's goals. */
export function recordGoalSolve(g: GoalsState, today: LocalDate, ev: SolveEvent): GoalsResult {
  const s = current(g, today);
  const ids = goalsFor(today);
  const progress = { ...s.progress };
  const completed: GoalId[] = [];
  for (const id of ids) {
    const before = progress[id] ?? 0;
    const after = Math.min(GOAL_TARGETS[id], before + gain(id, ev));
    if (after !== before) progress[id] = after;
    if (before < GOAL_TARGETS[id] && after >= GOAL_TARGETS[id]) completed.push(id);
  }
  const allDone = ids.every((id) => (progress[id] ?? 0) >= GOAL_TARGETS[id]);
  const rewardNow = allDone && !s.rewarded;
  return { state: { date: today, progress, rewarded: s.rewarded || rewardNow }, completed, rewardNow };
}
