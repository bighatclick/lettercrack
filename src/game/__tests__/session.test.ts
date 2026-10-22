import { content as seedContent, createContent, type QuoteDb } from '@/content/quotes';
import { defaultRoot, type Root } from '@/data/schema';
import { isLetterCell, isLockedCell, puzzleReducer, type PuzzleState } from '@/engine/puzzle';

import {
  completePuzzle,
  consumeHint,
  dailyRef,
  lifetimeSolves,
  nextLevelRef,
  onAppOpen,
  openPuzzle,
  refFromKey,
  saveProgress,
} from '../session';

const NOW = 1_800_000_000_000;
const TODAY = '2027-01-10';

const q = (id: number, text: string) => ({
  id,
  text,
  author: 'A',
  authorDates: '1800–1880',
  work: 'W',
  workYear: 1850,
  sourceCollection: 'S',
  sourceEdition: 'E',
  topics: [],
  difficulty: 'easy' as const,
});
const db: QuoteDb = {
  version: 'test',
  authors: { A: { dates: '1800–1880', bio: 'b' } },
  dailyOrder: [1, 2],
  quotes: [q(1, 'Daily one is here today.'), q(2, 'Daily two.'), q(3, 'Level three text, fairly long.'), q(4, 'Level four.')],
};
const content = createContent(db);

let k = 0;
function solve(s: PuzzleState): PuzzleState {
  for (let i = 0; i < s.plain.length; i++) {
    if (isLetterCell(s, i) && !isLockedCell(s, i) && s.entries[i] !== s.plain[i]) {
      s = puzzleReducer(puzzleReducer(s, { type: 'select', index: i }), { type: 'input', letter: s.plain[i]!, keyId: ++k });
    }
  }
  return s;
}

describe('session glue', () => {
  let root: Root;
  beforeEach(() => {
    root = defaultRoot(NOW);
  });

  it('parses keys and rejects unknown or future ones', () => {
    expect(refFromKey('level:3', content, TODAY)).toEqual({ key: 'level:3', mode: 'level', quoteId: 3, dailyDate: null });
    expect(refFromKey('level:99', content, TODAY)).toBeNull();
    expect(refFromKey('daily:2027-01-11', content, TODAY)).toBeNull();
    expect(refFromKey('daily:2027-01-10', content, TODAY)?.mode).toBe('daily');
    expect(refFromKey('rm -rf', content, TODAY)).toBeNull();
  });

  it('never offers daily-reserved quotes as levels', () => {
    const ref = nextLevelRef(root, content, 'easy')!;
    expect([3, 4]).toContain(ref.quoteId);
  });

  it('opens fresh, marks seen, autosaves and resumes exactly (F4)', () => {
    const ref = nextLevelRef(root, content, 'medium')!;
    const opened = openPuzzle(root, ref, content);
    expect(opened.root.progress.seenQuoteIds).toContain(ref.quoteId);
    expect(opened.difficulty).toBe('medium');

    let s = puzzleReducer(opened.state, { type: 'input', letter: 'Q', keyId: ++k });
    const saved = saveProgress(opened.root, ref, opened.difficulty, s, NOW + 1);
    const persisted: Root = JSON.parse(JSON.stringify(saved)); // kill + relaunch
    const resumed = openPuzzle(persisted, ref, content);
    expect(resumed.state.entries).toEqual(s.entries);
    // And the next level is the same unfinished puzzle.
    expect(nextLevelRef(persisted, content, 'easy')?.key).toBe(ref.key);
    s = resumed.state;
  });

  it('completes a level: records the solve, advances the level, clears the save, counts for ads', () => {
    const ref = nextLevelRef(root, content, 'easy')!;
    const opened = openPuzzle(root, ref, content);
    const s = solve(opened.state);
    const saved = saveProgress(opened.root, ref, 'easy', opened.state, NOW);
    const done = completePuzzle(saved, ref, 'easy', s, TODAY);
    expect(done.clean).toBe(true);
    expect(done.root.progress.solved[ref.quoteId]).toEqual({ date: TODAY, clean: true, timeMs: null, difficulty: 'easy' });
    expect(done.root.progress.levelIndex).toBe(1);
    expect(done.root.inProgress[ref.key]).toBeUndefined();
    expect(done.root.meta.solvesSinceInterstitial).toBe(1);
    expect(done.streak).toBeNull();
    expect(lifetimeSolves(done.root)).toBe(1);
    // Next pick is the other level quote.
    expect(nextLevelRef(done.root, content, 'easy')?.quoteId).not.toBe(ref.quoteId);
  });

  it('records solve time only when the timer setting is on', () => {
    root = { ...root, settings: { ...root.settings, showTimer: true } };
    const ref = nextLevelRef(root, content, 'easy')!;
    let s = openPuzzle(root, ref, content).state;
    s = puzzleReducer(s, { type: 'elapsed', ms: 5000 });
    expect(completePuzzle(root, ref, 'easy', solve(s), TODAY).root.progress.solved[ref.quoteId]?.timeMs).toBe(5000);
  });

  it('completes the daily and extends the streak', () => {
    const ref = dailyRef(TODAY, content, TODAY)!;
    const r0 = onAppOpen(root, TODAY);
    const s = solve(openPuzzle(r0, ref, content).state);
    const done = completePuzzle(r0, ref, 'medium', s, TODAY);
    expect(done.streak?.credited).toBe(true);
    expect(done.root.daily.streak).toBe(1);
    expect(done.root.progress.levelIndex).toBe(0);
  });

  it('refuses to complete an unsolved puzzle', () => {
    const ref = nextLevelRef(root, content, 'easy')!;
    expect(() => completePuzzle(root, ref, 'easy', openPuzzle(root, ref, content).state, TODAY)).toThrow();
  });

  it('spends free hints first, then nothing', () => {
    let r: Root | null = root;
    r = consumeHint(r, TODAY);
    r = consumeHint(r!, TODAY);
    expect(r).not.toBeNull();
    expect(consumeHint(r!, TODAY)).toBeNull();
  });

  it('works with the shipped seed content', () => {
    const ref = dailyRef(TODAY, seedContent, TODAY)!;
    expect(seedContent.quote(ref.quoteId)).toBeDefined();
    expect(seedContent.levelPool.some((p) => seedContent.dailySet.has(p.id))).toBe(false);
  });
});
