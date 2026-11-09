import { content } from '@/content/quotes';
import { defaultRoot, type Root } from '@/data/schema';
import { dailyQuoteId } from '@/engine/daily';

import {
  badgeFacts,
  currentAwardKeys,
  isSundaySpecial,
  library,
  markAwardsSeen,
  rankOf,
  refreshAwards,
  solvedDailyDates,
  stampBook,
  unseenAwards,
  xpOf,
} from '../awards';

const levelIds = content.levelPool.map((q) => q.id);
const letters = (id: number) => content.quote(id)!.text.replace(/[^a-z]/gi, '').length;

function solve(root: Root, ids: number[], date = '2027-01-10', clean = true): Root {
  const solved = { ...root.progress.solved };
  for (const id of ids) solved[id] = { date, clean, timeMs: null, difficulty: 'medium' };
  return { ...root, progress: { ...root.progress, solved } };
}

describe('rank and XP', () => {
  it('counts letters of every solved quote once', () => {
    const r = solve(defaultRoot(0), levelIds.slice(0, 3));
    expect(xpOf(r, content)).toBe(levelIds.slice(0, 3).reduce((a, id) => a + letters(id), 0));
    expect(rankOf(defaultRoot(0), content).rank).toBe('rookie');
  });
});

describe('Library', () => {
  it('lists each set with only the authors in the content, and collects solved authors', () => {
    const empty = library(defaultRoot(0), content);
    expect(empty.total).toBe(content.authors().length);
    expect(empty.collected.size).toBe(0);
    for (const s of empty.sets) expect(s.authors.length).toBeGreaterThan(0);
    const id = levelIds[0]!;
    const lib = library(solve(defaultRoot(0), [id]), content);
    expect(lib.collected.has(content.quote(id)!.author)).toBe(true);
  });

  it('marks a set done when all its authors are collected', () => {
    const lib = library(defaultRoot(0), content);
    const set = lib.sets[0]!;
    const ids = levelIds.concat(content.dailyOrder).filter((id) => set.authors.includes(content.quote(id)!.author));
    expect(library(solve(defaultRoot(0), ids), content).sets.find((s) => s.set === set.set)!.done).toBe(true);
  });
});

describe('Sunday specials and the stamp book', () => {
  it('knows Sundays', () => {
    expect(isSundaySpecial('2027-01-03')).toBe(true);
    expect(isSundaySpecial('2027-01-04')).toBe(false);
  });

  it('stamps solved dailies per month and gives a medal for a full month', () => {
    const jan = Array.from({ length: 31 }, (_, i) => `2027-01-${String(i + 1).padStart(2, '0')}`);
    const book = stampBook([...jan, '2027-02-01'], '2027-02-10', '2027-01-01');
    expect(book).toEqual([
      { month: '2027-02', days: 28, stamps: 1, medal: false },
      { month: '2027-01', days: 31, stamps: 31, medal: true },
    ]);
    expect(stampBook([], '2026-12-01', '2027-01-01')).toEqual([]);
  });

  it('finds dailies solved on the day or later from the archive', () => {
    const r = defaultRoot(0);
    r.daily.solvedDates = ['2027-01-01'];
    const late = dailyQuoteId('2027-01-02', content.dailyOrder);
    const solvedLate = solve(r, [late], '2027-01-05');
    const withArchive = { ...solvedLate, progress: { ...solvedLate.progress, lateDailies: ['2027-01-02'] } };
    expect(solvedDailyDates(withArchive, content, '2027-01-05')).toEqual(['2027-01-01', '2027-01-02']);
    expect(badgeFacts(withArchive, content, '2027-01-05').archiveSolves).toBe(1);
  });
});

describe('awarding and seen tracking', () => {
  it('awards retroactively and only once', () => {
    let r = solve(defaultRoot(0), levelIds.slice(0, 10));
    r.daily.best = 7;
    const a = refreshAwards(r, content, '2027-01-10');
    expect(a.fresh).toEqual(expect.arrayContaining(['first_solve', 'solves_10', 'first_clean', 'streak_7']));
    r = a.root;
    expect(refreshAwards(r, content, '2027-01-11').root).toBe(r);
    // The party hat comes with the 7-day streak badge.
    expect(currentAwardKeys(r, content)).toContain('item:partyhat');
  });

  it('reports unseen awards until marked seen', () => {
    const r = refreshAwards(solve(defaultRoot(0), levelIds.slice(0, 1)), content, '2027-01-10').root;
    const unseen = unseenAwards(r, content);
    expect(unseen).toContain('badge:first_solve');
    const seen = markAwardsSeen(r, unseen);
    expect(unseenAwards(seen, content)).toEqual([]);
    expect(markAwardsSeen(seen, unseen)).toBe(seen);
  });
});
