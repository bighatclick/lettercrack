import { freeHintsPerDay } from '@/config/features';
import { content as seedContent, createContent, type QuoteDb } from '@/content/quotes';
import { defaultRoot, type Root } from '@/data/schema';
import { isLetterCell, isLockedCell, puzzleReducer, type PuzzleState } from '@/engine/puzzle';

import { reportQuote } from '../report';

import {
  completePuzzle,
  consumeHint,
  dailyRef,
  hintsLeft,
  lifetimeSolves,
  nextLevelRef,
  onAppOpen,
  openPuzzle,
  refForPlayer,
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

  it('keeps a daily started before midnight playable and showable after it', () => {
    // The phone case: daily opened late on the 9th, solved after midnight. Yesterday stays playable.
    expect(refFromKey('daily:2026-11-09', content, '2026-11-10')?.dailyDate).toBe('2026-11-09');
  });

  it('counts a daily opened before midnight and solved after it for its own day (streak, not a late solve)', () => {
    const day1 = '2026-11-09';
    const day2 = '2026-11-10';
    const ref = refFromKey(`daily:${day1}`, content, day1)!;
    const opened = openPuzzle(root, ref, content);
    const late = completePuzzle(opened.root, ref, opened.difficulty, solve(opened.state), day2, day1);
    expect(late.streak?.credited).toBe(true);
    expect(late.root.daily.solvedDates).toEqual([day1]);
    expect(late.root.daily.streak).toBe(1);
    expect(late.root.progress.lateDailies).toEqual([]);
    // Opened from the archive the next day: a late solve, no streak.
    const fromArchive = completePuzzle(opened.root, ref, opened.difficulty, solve(opened.state), day2, day2);
    expect(fromArchive.streak?.credited).toBe(false);
    expect(fromArchive.root.progress.lateDailies).toEqual([day1]);
  });

  it('still shows a daily solved after midnight when its date is no longer playable', () => {
    // Only today's daily is playable before the epoch (a phone clock set years back).
    const day1 = '2020-03-09';
    const day2 = '2020-03-10';
    const key = `daily:${day1}`;
    const ref = refFromKey(key, content, day1)!;
    const opened = openPuzzle(root, ref, content);
    const saved = saveProgress(opened.root, ref, opened.difficulty, opened.state, NOW);
    expect(refFromKey(key, content, day2)).toBeNull();
    // An open save can be resumed the next day.
    expect(refForPlayer(key, saved, content, day2)).toEqual(ref);
    // The solve is recorded and the Solved screen can still show it.
    const done = completePuzzle(saved, ref, opened.difficulty, solve(opened.state), day2).root;
    expect(done.progress.solved[ref.quoteId]).toBeDefined();
    expect(done.progress.lateDailies).toContain(day1);
    expect(refForPlayer(key, done, content, day2)).toEqual(ref);
    // Unknown past dailies, future dates and garbage stay unavailable.
    expect(refForPlayer('daily:2020-03-08', done, content, day2)).toBeNull();
    expect(refForPlayer('daily:2020-03-11', done, content, day2)).toBeNull();
    expect(refForPlayer('daily:2026-13-40', done, content, day2)).toBeNull();
    expect(refForPlayer('level:3', done, content, day2)?.quoteId).toBe(3);
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

  it('never brings a reported quote back, even if the open puzzle autosaves after the report', () => {
    const ref = nextLevelRef(root, content, 'medium')!;
    const opened = openPuzzle(root, ref, content);
    const s = puzzleReducer(opened.state, { type: 'input', letter: 'Q', keyId: ++k });
    let r = saveProgress(opened.root, ref, opened.difficulty, s, NOW + 1);

    r = reportQuote(r, ref.quoteId);
    expect(r.inProgress[ref.key]).toBeUndefined();
    // The puzzle screen is still mounted for a moment: its elapsed-time tick autosaves again.
    const tick = puzzleReducer(s, { type: 'elapsed', ms: 1000 });
    r = saveProgress(r, ref, opened.difficulty, tick, NOW + 2);
    expect(r.inProgress[ref.key]).toBeUndefined();

    const next = nextLevelRef(r, content, 'medium');
    expect(next?.quoteId).not.toBe(ref.quoteId);
  });

  it('skips a reported quote save left by older builds', () => {
    const ref = nextLevelRef(root, content, 'medium')!;
    const opened = openPuzzle(root, ref, content);
    const s = puzzleReducer(opened.state, { type: 'input', letter: 'Q', keyId: ++k });
    const saved = saveProgress(opened.root, ref, opened.difficulty, s, NOW + 1);
    const stale: Root = { ...saved, progress: { ...saved.progress, reportedQuoteIds: [ref.quoteId] } };
    expect(nextLevelRef(stale, content, 'medium')?.quoteId).not.toBe(ref.quoteId);
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

  it('remembers an archive day solved later, without streak credit (D20)', () => {
    const past = '2027-01-08';
    const ref = dailyRef(past, content, TODAY)!;
    const r0 = onAppOpen(root, TODAY);
    const done = completePuzzle(r0, ref, 'medium', solve(openPuzzle(r0, ref, content).state), TODAY);
    expect(done.streak?.credited).toBe(false);
    expect(done.root.progress.lateDailies).toEqual([past]);
    expect(done.root.daily.solvedDates).toEqual([]);
  });

  it("remembers today's daily solved on a wound-back clock (D21)", () => {
    const r0 = onAppOpen(onAppOpen(root, '2027-01-12'), TODAY);
    const ref = dailyRef(TODAY, content, TODAY)!;
    const done = completePuzzle(r0, ref, 'medium', solve(openPuzzle(r0, ref, content).state), TODAY);
    expect(done.streak?.credited).toBe(false);
    expect(done.root.progress.lateDailies).toEqual([TODAY]);
    expect(done.goals.state.progress.daily).toBe(1);
  });

  it("counts the solve toward today's goals and grants the hint once they are all done", () => {
    const ref = dailyRef(TODAY, content, TODAY)!;
    const r0 = onAppOpen(root, TODAY);
    const done = completePuzzle(r0, ref, 'medium', solve(openPuzzle(r0, ref, content).state), TODAY);
    expect(done.goals.completed).toContain('daily');
    expect(done.root.goals.date).toBe(TODAY);
    // Every other goal already done: the next solve finishes the set and pays out, once.
    const nearly: Root = {
      ...done.root,
      goals: { date: TODAY, progress: { daily: 1, levels2: 2, levels3: 2, clean: 1, hard: 1, letters150: 149, long: 1 }, rewarded: false },
    };
    const lref = nextLevelRef(nearly, content, 'easy')!;
    const again = completePuzzle(nearly, lref, 'easy', solve(openPuzzle(nearly, lref, content).state), TODAY);
    expect(again.goals.rewardNow).toBe(true);
    expect(again.root.hints.balance).toBe(nearly.hints.balance + 1);
    const third = completePuzzle(again.root, lref, 'easy', solve(openPuzzle(again.root, lref, content).state), TODAY);
    expect(third.goals.rewardNow).toBe(false);
    expect(third.root.hints.balance).toBe(again.root.hints.balance);
  });

  it('refuses to complete an unsolved puzzle', () => {
    const ref = nextLevelRef(root, content, 'easy')!;
    expect(() => completePuzzle(root, ref, 'easy', openPuzzle(root, ref, content).state, TODAY)).toThrow();
  });

  it('spends the free allowance set by the switches, then nothing', () => {
    let r: Root | null = root;
    expect(hintsLeft(root.hints, TODAY)).toBe(freeHintsPerDay());
    for (let i = 0; i < freeHintsPerDay(); i++) {
      r = consumeHint(r!, TODAY);
      expect(r).not.toBeNull();
    }
    expect(consumeHint(r!, TODAY)).toBeNull();
    expect(hintsLeft(r!.hints, '2027-01-11')).toBe(freeHintsPerDay());
  });

  it('works with the shipped seed content', () => {
    const ref = dailyRef(TODAY, seedContent, TODAY)!;
    expect(seedContent.quote(ref.quoteId)).toBeDefined();
    expect(seedContent.levelPool.some((p) => seedContent.dailySet.has(p.id))).toBe(false);
  });
});
