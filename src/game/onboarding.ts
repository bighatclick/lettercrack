import type { Root } from '@/data/schema';
import type { Difficulty, PuzzleInit } from '@/engine/puzzle';

/** S8: one tiny puzzle. Fixed seed so everyone sees the same cipher. */
export const ONBOARDING_TEXT = 'A CAT';

export const onboardingInit = (autoFill: boolean): PuzzleInit => ({
  text: ONBOARDING_TEXT,
  seed: 'onboarding',
  difficulty: 'expert',
  autoFill,
});

export const needsOnboarding = (root: Root) => root.meta.onboardedAt === null;

export const completeOnboarding = (root: Root, difficulty: Difficulty, now: number): Root => ({
  ...root,
  settings: { ...root.settings, defaultDifficulty: difficulty },
  meta: { ...root.meta, onboardedAt: now, settingsUpdatedAt: now },
});
