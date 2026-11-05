import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import type { LocalDate } from '@/engine/daily';
import { displayStreak } from '@/engine/streak';

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
  return {
    solved: records.length,
    clean: records.filter(([, r]) => r.clean).length,
    streak: displayStreak(root.daily, today),
    best: root.daily.best,
    dailiesSolved: root.daily.solvedDates.length,
    averageMs:
      root.settings.showTimer && times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    favouriteAuthors,
  };
}
