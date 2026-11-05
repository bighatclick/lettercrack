import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { archiveDates, dailyQuoteId, LAUNCH_DATE, type LocalDate } from '@/engine/daily';

import { dailyKey } from './session';

export type ArchiveDay = { date: LocalDate; day: number; status: 'solved' | 'inProgress' | 'open' };
export type ArchiveMonth = {
  /** `YYYY-MM` */
  month: string;
  /** Weekday of the first day shown: 0 = Monday … 6 = Sunday. */
  offset: number;
  days: ArchiveDay[];
};

/** A daily counts as solved if its quote has a solve record dated on or after that day (S4). */
export function dailyStatus(root: Root, content: Content, date: LocalDate, launch = LAUNCH_DATE): ArchiveDay['status'] {
  if (root.daily.solvedDates.includes(date)) return 'solved';
  const rec = root.progress.solved[dailyQuoteId(date, content.dailyOrder, launch)];
  if (rec && rec.date >= date) return 'solved';
  return root.inProgress[dailyKey(date)] ? 'inProgress' : 'open';
}

/** Past dailies (yesterday back to launch) grouped by month, newest month first, days in calendar order. */
export function archiveMonths(root: Root, content: Content, today: LocalDate, launch = LAUNCH_DATE): ArchiveMonth[] {
  const groups = new Map<string, ArchiveDay[]>();
  for (const date of archiveDates(today, launch)) {
    const month = date.slice(0, 7);
    const list = groups.get(month) ?? [];
    list.push({ date, day: Number(date.slice(8)), status: dailyStatus(root, content, date, launch) });
    groups.set(month, list);
  }
  return [...groups.entries()].map(([month, days]) => {
    days.sort((a, b) => a.day - b.day);
    const first = days[0]!.date;
    const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    return { month, offset, days };
  });
}
