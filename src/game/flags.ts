import { conflicts, type PuzzleState, wrongWhenFilled } from '@/engine/puzzle';

export type CellFlag = 'conflict' | 'wrong';

/** Which cells to flag. "Wrong" (from Check, or a full-but-wrong board) wins over "conflict". */
export function cellFlags(state: PuzzleState, highlightConflicts: boolean): Map<number, CellFlag> {
  const m = new Map<number, CellFlag>();
  if (highlightConflicts) for (const i of conflicts(state)) m.set(i, 'conflict');
  for (const i of state.checkedWrong) m.set(i, 'wrong');
  for (const i of wrongWhenFilled(state)) m.set(i, 'wrong');
  return m;
}
