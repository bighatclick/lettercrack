import { content } from '@/content/quotes';
import { defaultRoot, type Root } from '@/data/schema';
import { dailyQuoteId, type LocalDate } from '@/engine/daily';

import { badgeFacts } from '../awards';
import { computeStats, solvedCounts } from '../stats';

function solveDaily(root: Root, date: LocalDate, solvedOn: LocalDate, onDay: boolean): Root {
  const id = dailyQuoteId(date, content.dailyOrder);
  return {
    ...root,
    progress: {
      ...root.progress,
      solved: { ...root.progress.solved, [id]: { date: solvedOn, clean: true, timeMs: null, difficulty: 'medium' } },
      lateDailies: onDay ? root.progress.lateDailies : [...root.progress.lateDailies, date].sort(),
    },
    daily: onDay ? { ...root.daily, solvedDates: [...root.daily.solvedDates, date] } : root.daily,
  };
}

const installed = (date: string) => defaultRoot(new Date(`${date}T08:00:00`).getTime());

describe('D36: Time traveller only for a daily solved on a later day', () => {
  it('a daily solved on its own date without streak credit (travel west) is not an archive solve', () => {
    let r = installed('2026-11-02');
    r = solveDaily(r, '2026-11-03', '2026-11-03', true);
    r = solveDaily(r, '2026-11-02', '2026-11-02', false); // west of the date line: yesterday's daily, on its own date
    expect(badgeFacts(r, content, '2026-11-03').archiveSolves).toBe(0);
  });

  it('a daily solved from the archive on a later day is', () => {
    let r = installed('2026-11-02');
    r = solveDaily(r, '2026-11-02', '2026-11-04', false);
    expect(badgeFacts(r, content, '2026-11-04').archiveSolves).toBe(1);
  });
});

describe('D40: one solve count on Home, Stats and the Archive', () => {
  it('counts archive solves in "Daily quotes solved" and one puzzle per solved daily date', () => {
    let r = installed('2026-11-01');
    r = solveDaily(r, '2026-11-05', '2026-11-05', true);
    r = solveDaily(r, '2026-11-01', '2026-11-05', false);
    r = solveDaily(r, '2026-11-02', '2026-11-05', false);
    const level = content.levelPool.find((q) => !content.dailyOrder.includes(q.id))!.id;
    r = { ...r, progress: { ...r.progress, solved: { ...r.progress.solved, [level]: { date: '2026-11-05', clean: false, timeMs: null, difficulty: 'easy' } } } };
    const c = solvedCounts(r, content, '2026-11-05');
    expect(c).toEqual({ puzzles: 4, dailies: 3 });
    const s = computeStats(r, content, '2026-11-05');
    expect(s.solved).toBe(4);
    expect(s.dailiesSolved).toBe(3);
  });

  it('counts two dates that share a quote as two dailies', () => {
    const len = content.dailyOrder.length;
    const a: LocalDate = '2026-11-01';
    const b = new Date(Date.UTC(2026, 10, 1 + len)).toISOString().slice(0, 10) as LocalDate;
    expect(dailyQuoteId(a, content.dailyOrder)).toBe(dailyQuoteId(b, content.dailyOrder));
    let r = installed(a);
    r = solveDaily(r, a, a, true);
    r = solveDaily(r, b, b, true);
    expect(solvedCounts(r, content, b)).toEqual({ puzzles: 2, dailies: 2 });
  });
});
