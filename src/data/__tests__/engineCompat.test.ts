/**
 * Compile-time guarantees that the persisted schema and the engine agree. If one side changes
 * without the other, `npm run typecheck` fails here (and the change needs a migration).
 */
import type { GoalsState } from '@/engine/goals';
import type { HintsState } from '@/engine/hints';
import type { Difficulty, PuzzleSnapshot } from '@/engine/puzzle';
import type { StreakState } from '@/engine/streak';

import type { Difficulty as SchemaDifficulty, PuzzleSave, Root } from '../schema';

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const hints: Equals<Root['hints'], HintsState> = true;
const streak: Equals<Root['daily'], StreakState> = true;
const goals: Equals<Root['goals'], GoalsState> = true;
const difficulty: Equals<SchemaDifficulty, Difficulty> = true;
const snapshot: Equals<Pick<PuzzleSave, keyof PuzzleSnapshot>, PuzzleSnapshot> = true;

it('schema and engine types agree', () => {
  expect([hints, streak, goals, difficulty, snapshot]).toEqual([true, true, true, true, true]);
});
