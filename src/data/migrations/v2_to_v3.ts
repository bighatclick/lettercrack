import type { Migration } from './index';

/** Must match FREEZE_MILESTONES / MAX_BONUS_FREEZES in src/engine/streak.ts at the time of v3. */
const FREEZE_MILESTONES_V3 = [7, 30, 100];
const MAX_BONUS_FREEZES_V3 = 3;

/**
 * v2 → v3: adds daily goals and saved streak freezes.
 * Players whose current streak already passed a freeze milestone get that freeze now,
 * so nobody misses out by having started before the feature existed.
 */
export const v2_to_v3: Migration = (old) => {
  const daily = (old.daily ?? {}) as Record<string, unknown>;
  const streak = typeof daily.streak === 'number' ? daily.streak : 0;
  const passed = FREEZE_MILESTONES_V3.filter((m) => streak >= m);
  return {
    ...old,
    daily: {
      ...daily,
      bonusFreezes: Math.min(MAX_BONUS_FREEZES_V3, passed.length),
      milestonesAwarded: passed,
    },
    goals: { date: null, progress: {}, rewarded: false },
  };
};
