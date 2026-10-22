import { levelSeed } from '../cipher';
import {
  chooseGivens,
  conflicts,
  createPuzzle,
  type Difficulty,
  isClean,
  isLetterCell,
  isLockedCell,
  type PuzzleAction,
  type PuzzleInit,
  puzzleReducer,
  type PuzzleState,
  restorePuzzle,
  snapshot,
  wrongWhenFilled,
} from '../puzzle';
import { createRng, randInt } from '../rng';
import { sampleQuotes } from './fixtures/sampleQuotes';

const TEXT = 'Well done is better than well said.';
const init = (over: Partial<PuzzleInit> = {}): PuzzleInit => ({
  text: TEXT,
  seed: levelSeed(1),
  difficulty: 'expert',
  autoFill: true,
  ...over,
});

let keyId = 0;
const type = (s: PuzzleState, letter: string) => puzzleReducer(s, { type: 'input', letter, keyId: ++keyId });
const erase = (s: PuzzleState) => puzzleReducer(s, { type: 'erase', keyId: ++keyId });
const select = (s: PuzzleState, index: number) => puzzleReducer(s, { type: 'select', index });
const firstCellOf = (s: PuzzleState, plainLetter: string) => s.plain.indexOf(plainLetter);

/** Types the right answer for every unlocked cipher letter. */
function solve(s: PuzzleState): PuzzleState {
  for (let i = 0; i < s.plain.length; i++) {
    if (isLetterCell(s, i) && !isLockedCell(s, i) && s.entries[i] !== s.plain[i]) {
      s = type(select(s, i), s.plain[i]!);
    }
  }
  return s;
}

describe('createPuzzle', () => {
  it('encrypts letters only and starts on the first open cell', () => {
    const s = createPuzzle(init());
    expect(s.plain).toBe('WELL DONE IS BETTER THAN WELL SAID.');
    expect(s.cipher).toHaveLength(s.plain.length);
    expect(s.cipher[4]).toBe(' ');
    expect(s.cipher.at(-1)).toBe('.');
    expect(s.selected).toBe(0);
    expect(s.solved).toBe(false);
  });

  it('is deterministic for a seed', () => {
    expect(createPuzzle(init())).toEqual(createPuzzle(init()));
  });

  it.each<[Difficulty, number, number]>([
    ['easy', 3, 4],
    ['medium', 2, 2],
    ['hard', 1, 1],
    ['expert', 0, 0],
  ])('%s pre-fills %i–%i letters', (difficulty, min, max) => {
    const counts = new Set<number>();
    for (let q = 0; q < 300; q++) {
      const s = createPuzzle(init({ difficulty, seed: levelSeed(q), text: sampleQuotes[q % 50]! }));
      expect(s.givens.length).toBeGreaterThanOrEqual(min);
      expect(s.givens.length).toBeLessThanOrEqual(max);
      counts.add(s.givens.length);
      // Givens are filled in and correct.
      s.plain.split('').forEach((p, i) => {
        if (s.givens.includes(s.cipher[i]!)) expect(s.entries[i]).toBe(p);
      });
    }
    if (difficulty === 'easy') expect([...counts].sort()).toEqual([3, 4]);
  });

  it('always leaves at least two letters to solve', () => {
    // "A CAT" has 3 distinct letters, so even Easy gives at most 1.
    expect(chooseGivens('A CAT', 'X ZXY', 'easy', 's').length).toBeLessThanOrEqual(1);
    expect(chooseGivens('AA', 'BB', 'easy', 's')).toEqual([]);
  });
});

describe('input', () => {
  it('auto-fill fills every occurrence of the cipher letter and skips to the next open cell', () => {
    let s = createPuzzle(init());
    const l = firstCellOf(s, 'L'); // WELL ... WELL
    s = type(select(s, l), 'L');
    s.plain.split('').forEach((p, i) => {
      expect(s.entries[i]).toBe(p === 'L' ? 'L' : '');
    });
    expect(s.selected).toBe(l + 3); // "WELL DONE": skips the filled second L and the space, lands on D
  });

  it('without auto-fill, fills only the selected cell', () => {
    let s = createPuzzle(init({ autoFill: false }));
    s = type(select(s, 2), 'L');
    expect(s.entries.filter((e) => e === 'L')).toHaveLength(1);
    expect(s.selected).toBe(3);
  });

  it('ignores a repeated key id (no double entry, F3)', () => {
    const s0 = createPuzzle(init());
    const s1 = puzzleReducer(s0, { type: 'input', letter: 'W', keyId: 7 });
    const s2 = puzzleReducer(s1, { type: 'input', letter: 'Q', keyId: 7 });
    expect(s2).toBe(s1);
  });

  it('ignores non-letters and typing into a locked cell', () => {
    const s0 = createPuzzle(init({ difficulty: 'easy' }));
    const s1 = type(s0, '3');
    expect(s1.entries).toEqual(s0.entries);
    const locked = s0.plain.split('').findIndex((_, i) => isLockedCell(s0, i));
    const s2 = type(select(s0, locked), 'Z');
    expect(s2.entries).toEqual(s0.entries);
  });

  it('only selects letter cells', () => {
    const s = createPuzzle(init());
    expect(select(s, 4)).toBe(s); // a space
  });

  it('accepts lowercase from a hardware keyboard', () => {
    const s = type(createPuzzle(init()), 'w');
    expect(s.entries[0]).toBe('W');
  });
});

describe('erase', () => {
  it('clears a filled cell (all occurrences with auto-fill)', () => {
    let s = createPuzzle(init());
    s = type(select(s, 2), 'L');
    s = erase(select(s, 3));
    expect(s.entries.filter((e) => e === 'L')).toHaveLength(0);
  });

  it('on an empty cell, steps back and clears the previous cell', () => {
    let s = createPuzzle(init({ autoFill: false }));
    s = type(select(s, 0), 'W'); // selection moves to 1
    s = erase(s);
    expect(s.selected).toBe(0);
    expect(s.entries[0]).toBe('');
  });
});

describe('conflicts', () => {
  it('flags one plain letter used for two cipher letters', () => {
    let s = createPuzzle(init());
    s = type(select(s, firstCellOf(s, 'W')), 'X');
    s = type(select(s, firstCellOf(s, 'D')), 'X');
    const c = conflicts(s);
    expect(c.has(firstCellOf(s, 'W'))).toBe(true);
    expect(c.has(firstCellOf(s, 'D'))).toBe(true);
    expect(c.has(firstCellOf(s, 'E'))).toBe(false);
  });

  it('flags one cipher letter guessed two ways (auto-fill off)', () => {
    let s = createPuzzle(init({ autoFill: false }));
    s = type(select(s, 2), 'L');
    s = type(select(s, 3), 'M');
    expect([...conflicts(s)].sort()).toEqual([2, 3]);
  });
});

describe('completion', () => {
  it('solves when every cell is correct, then ignores input', () => {
    const s = solve(createPuzzle(init()));
    expect(s.solved).toBe(true);
    expect(s.selected).toBeNull();
    expect(isClean(s)).toBe(true);
    expect(type(s, 'A')).toBe(s);
    expect(puzzleReducer(s, { type: 'elapsed', ms: 1000 })).toBe(s);
  });

  it('when full but wrong, shows the wrong cells gently and does not solve', () => {
    let s = solve(createPuzzle(init({ autoFill: false })));
    expect(s.solved).toBe(true);
    s = createPuzzle(init({ autoFill: false }));
    for (let i = 0; i < s.plain.length; i++) {
      if (isLetterCell(s, i)) s = type(select(s, i), i === 0 ? 'Q' : s.plain[i]!);
    }
    expect(s.solved).toBe(false);
    expect(wrongWhenFilled(s)).toEqual([0]);
    s = type(select(s, 0), 'W');
    expect(s.solved).toBe(true);
  });
});

describe('hints', () => {
  it('reveal fills the selected cipher letter everywhere, locks it and costs a hint', () => {
    let s = createPuzzle(init());
    s = select(s, firstCellOf(s, 'L'));
    s = puzzleReducer(s, { type: 'reveal' });
    s.plain.split('').forEach((p, i) => p === 'L' && expect(s.entries[i]).toBe('L'));
    expect(s.hintsUsed).toBe(1);
    expect(isClean(s)).toBe(false);
    const locked = type(select(s, firstCellOf(s, 'L')), 'Z');
    expect(locked.entries[firstCellOf(s, 'L')]).toBe('L');
  });

  it('reveal picks the first unsolved letter when the selection is already right', () => {
    let s = createPuzzle(init());
    s = type(select(s, 0), 'W');
    s = select(s, 0);
    s = puzzleReducer(s, { type: 'reveal' });
    expect(s.revealed).toEqual([s.cipher[1]]); // E
  });

  it('revealing every letter solves the puzzle', () => {
    let s = createPuzzle(init());
    for (let i = 0; i < 30 && !s.solved; i++) s = puzzleReducer(s, { type: 'reveal' });
    expect(s.solved).toBe(true);
    expect(puzzleReducer(s, { type: 'reveal' })).toBe(s);
  });

  it('check marks wrong letters only, costs a check, and marks clear when edited', () => {
    let s = createPuzzle(init({ autoFill: false }));
    s = type(select(s, 0), 'W');
    s = type(select(s, 1), 'Q');
    s = puzzleReducer(s, { type: 'check' });
    expect(s.checkedWrong).toEqual([1]);
    expect(s.checksUsed).toBe(1);
    expect(isClean(s)).toBe(false);
    s = type(select(s, 1), 'E');
    expect(s.checkedWrong).toEqual([]);
  });
});

describe('save and restore (F4)', () => {
  it('restores exactly from a snapshot', () => {
    let s = createPuzzle(init({ difficulty: 'medium' }));
    s = type(select(s, 0), 'W');
    s = puzzleReducer(select(s, 5), { type: 'reveal' });
    s = puzzleReducer(s, { type: 'elapsed', ms: 4200 });
    const r = restorePuzzle(init({ difficulty: 'medium' }), JSON.parse(JSON.stringify(snapshot(s))));
    expect(r.entries).toEqual(s.entries);
    expect(r.revealed).toEqual(s.revealed);
    expect(r.hintsUsed).toBe(1);
    expect(r.elapsedMs).toBe(4200);
  });

  it('starts fresh but keeps counters if the quote text changed length', () => {
    const s = createPuzzle(init());
    const r = restorePuzzle(init({ text: 'Well done.' }), { ...snapshot(s), hintsUsed: 2 });
    expect(r.plain).toBe('WELL DONE.');
    expect(r.hintsUsed).toBe(2);
  });

  it('drops garbage entries from a damaged save', () => {
    const s = createPuzzle(init());
    const entries = s.entries.map(() => '?');
    const r = restorePuzzle(init(), { ...snapshot(s), entries });
    expect(r.entries.every((e) => e === '')).toBe(true);
  });
});

describe('fuzz: random play keeps the invariants', () => {
  it('holds for 500 random sessions', () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let run = 0; run < 500; run++) {
      const rng = createRng(`fuzz:${run}`);
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
      let s = createPuzzle({
        text: sampleQuotes[run % 50]!,
        seed: levelSeed(run),
        difficulty: difficulties[run % 4]!,
        autoFill: run % 3 !== 0,
      });
      for (let step = 0; step < 200; step++) {
        const r = randInt(rng, 100);
        let a: PuzzleAction;
        if (r < 45) a = { type: 'input', letter: letters[randInt(rng, 26)]!, keyId: ++keyId };
        else if (r < 60) a = { type: 'select', index: randInt(rng, s.plain.length) };
        else if (r < 72) a = { type: 'erase', keyId: ++keyId };
        else if (r < 80) a = { type: 'move', delta: rng() < 0.5 ? 1 : -1 };
        else if (r < 84) a = { type: 'reveal' };
        else if (r < 88) a = { type: 'check' };
        else if (r < 90) a = { type: 'setAutoFill', on: rng() < 0.5 };
        else a = { type: 'input', letter: s.selected === null ? 'A' : s.plain[s.selected]!, keyId: ++keyId };
        s = puzzleReducer(s, a);

        // Plain checks in the hot loop (expect() per cell would be ~30M calls); throw on the first violation.
        const fail = (why: string) => {
          throw new Error(`run ${run} step ${step} after ${JSON.stringify(a)}: ${why}`);
        };
        if (s.entries.length !== s.plain.length) fail('entries length changed');
        let allRight = true;
        for (let i = 0; i < s.plain.length; i++) {
          const letter = isLetterCell(s, i);
          if (!letter && s.entries[i] !== '') fail(`non-letter cell ${i} has an entry`);
          if (letter && isLockedCell(s, i) && s.entries[i] !== s.plain[i]) fail(`locked cell ${i} is wrong`);
          if (letter && s.entries[i] !== s.plain[i]) allRight = false;
        }
        if (s.solved !== allRight) fail(`solved=${s.solved} but allRight=${allRight}`);
        if (s.selected !== null && !isLetterCell(s, s.selected)) fail('selection on a non-letter cell');
        if (s.solved) break;
      }
    }
  });
});
