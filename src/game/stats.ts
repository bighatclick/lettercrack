import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { dailyQuoteId, type LocalDate } from '@/engine/daily';
import { displayStreak } from '@/engine/streak';

import { solvedDailyDates } from './awards';

/**
 * Puzzles solved, counted the same way on Home and Stats (D40): one per solved daily date (the
 * Archive's count, archive solves included) plus one per other quote solved. A quote solved both
 * as a level and as a daily counts twice, since those were two puzzles. Solving the same archive
 * day again counts once.
 */
export function solvedCounts(root: Root, content: Content, today: LocalDate): { puzzles: number; dailies: number } {
  const dates = solvedDailyDates(root, content, today);
  const dailyQuotes = new Set(dates.map((d) => dailyQuoteId(d, content.dailyOrder)));
  const others = Object.keys(root.progress.solved).filter((id) => !dailyQuotes.has(Number(id))).length;
  return { puzzles: dates.length + others, dailies: dates.length };
}

export type Stats = {
  solved: number;
  clean: number;
  streak: number;
  best: number;
  dailiesSolved: number;
  /** Only when the timer setting is on and at least one timed solve exists (S5). */
  averageMs: number | null;
  /** Up to 3 authors with the most solves, most first; ties alphabetical. */
  favouriteAuthors: { author: string; count: number }[];
};

export function computeStats(root: Root, content: Content, today: LocalDate): Stats {
  const records = Object.entries(root.progress.solved);
  const times = records.map(([, r]) => r.timeMs).filter((t): t is number => typeof t === 'number' && t > 0);
  const byAuthor = new Map<string, number>();
  for (const [id] of records) {
    const q = content.quote(Number(id));
    if (q) byAuthor.set(q.author, (byAuthor.get(q.author) ?? 0) + 1);
  }
  const favouriteAuthors = [...byAuthor.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([author, count]) => ({ author, count }));
  const counts = solvedCounts(root, content, today);
  return {
    solved: counts.puzzles,
    clean: records.filter(([, r]) => r.clean).length,
    streak: displayStreak(root.daily, today),
    best: root.daily.best,
    dailiesSolved: counts.dailies,
    averageMs:
      root.settings.showTimer && times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    favouriteAuthors,
  };
}
