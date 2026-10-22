import { fitsDifficulty, markSeen, pickNextQuote, type PoolQuote } from '../picker';
import type { Difficulty } from '../puzzle';
import { createRng, randInt } from '../rng';

const rng = createRng('pool');
const POOL: PoolQuote[] = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, length: 40 + randInt(rng, 121) }));
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function run(picks: number, opts: { difficulty?: (i: number) => Difficulty; exclude?: Set<number> } = {}) {
  let seen: number[] = [];
  const out: number[] = [];
  for (let i = 0; i < picks; i++) {
    const id = pickNextQuote({ pool: POOL, seen, exclude: opts.exclude, difficulty: opts.difficulty?.(i) });
    if (id === null) throw new Error('no pick');
    out.push(id);
    seen = markSeen(seen, id);
  }
  return out;
}

describe('picker (F6)', () => {
  it('1,000 picks over a 600-quote pool: 0 repeats before exhaustion', () => {
    const picks = run(1000);
    expect(new Set(picks.slice(0, 600)).size).toBe(600);
    // After exhaustion, repeats come oldest-seen first.
    expect(picks.slice(600, 1000)).toEqual(picks.slice(0, 400));
  });

  it('still never repeats before exhaustion when the difficulty changes every pick', () => {
    const picks = run(600, { difficulty: (i) => DIFFS[i % 4]! });
    expect(new Set(picks).size).toBe(600);
  });

  it('prefers quotes that fit the chosen difficulty', () => {
    const picks = run(50, { difficulty: () => 'easy' });
    for (const id of picks) expect(fitsDifficulty(POOL[id - 1]!, 'easy')).toBe(true);
  });

  it('never picks excluded (daily-reserved or reported) quotes', () => {
    const exclude = new Set(POOL.filter((q) => q.id % 3 === 0).map((q) => q.id));
    const picks = run(700, { exclude });
    expect(picks.some((id) => exclude.has(id))).toBe(false);
    expect(new Set(picks.slice(0, 400)).size).toBe(400);
  });

  it('returns null for an empty or fully excluded pool', () => {
    expect(pickNextQuote({ pool: [], seen: [] })).toBeNull();
    expect(pickNextQuote({ pool: [{ id: 1, length: 50 }], seen: [], exclude: new Set([1]) })).toBeNull();
  });

  it('ignores seen IDs that are no longer in the pool', () => {
    expect(pickNextQuote({ pool: [{ id: 2, length: 50 }], seen: [99, 2] })).toBe(2);
  });

  it('markSeen keeps the list ordered oldest → newest without duplicates', () => {
    expect(markSeen([1, 2, 3], 2)).toEqual([1, 3, 2]);
    expect(markSeen([], 5)).toEqual([5]);
  });
});
