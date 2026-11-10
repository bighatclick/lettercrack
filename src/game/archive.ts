import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { addDays, archiveDates, dailyQuoteId, type LocalDate } from '@/engine/daily';

import { dailyKey, dailyStart } from './session';

export { dailyStart };

/** The anchor pre-v5 saves were made with: their legacy solves map dates to quotes with it. */
const LEGACY_EPOCH: LocalDate = '2027-01-01';

export type ArchiveDay = { date: LocalDate; day: number; status: 'solved' | 'inProgress' | 'open' };
export type ArchiveMonth = {
  /** `YYYY-MM` */
  month: string;
  /** Weekday of the first day shown: 0 = Monday … 6 = Sunday. */
  offset: number;
  days: ArchiveDay[];
};

/**
 * A daily is solved if it was solved on its day, or later from the archive (S4).
 * (Until `settleLegacyDailies` runs, a pre-v5 save also uses the old rule; see there.)
 */
export function dailyStatus(root: Root, content: Content, date: LocalDate, legacyEpoch = LEGACY_EPOCH): ArchiveDay['status'] {
  if (root.daily.solvedDates.includes(date) || root.progress.lateDailies.includes(date)) return 'solved';
  if (legacySolved(root, content, date, legacyEpoch)) return 'solved';
  return root.inProgress[dailyKey(date)] ? 'inProgress' : 'open';
}

/** The pre-v5 rule: that day's quote has a solve record dated on or after the day (and by the cutoff). */
function legacySolved(root: Root, content: Content, date: LocalDate, legacyEpoch: LocalDate): boolean {
  const cutoff = root.progress.legacyDailyCutoff;
  if (cutoff === null || date > cutoff || date < legacyEpoch) return false;
  const rec = root.progress.solved[dailyQuoteId(date, content.dailyOrder, legacyEpoch)];
  return !!rec && rec.date >= date && rec.date <= cutoff;
}

/**
 * Runs once, on the first launch after the v5 migration (before any new solve): every day the old
 * rule marked solved is written into lateDailies, and the old rule is switched off. From then on
 * a new solve can't mark other days that share its quote. Nothing that showed as solved is lost.
 */
export function settleLegacyDailies(root: Root, content: Content, legacyEpoch = LEGACY_EPOCH): Root {
  const cutoff = root.progress.legacyDailyCutoff;
  if (cutoff === null) return root;
  const late = new Set(root.progress.lateDailies);
  for (let d = legacyEpoch; d <= cutoff; d = addDays(d, 1)) {
    if (!root.daily.solvedDates.includes(d) && legacySolved(root, content, d, legacyEpoch)) late.add(d);
  }
  return { ...root, progress: { ...root.progress, lateDailies: [...late].sort(), legacyDailyCutoff: null } };
}

/** Past dailies (yesterday back to the player's first day) by month, newest month first, days in calendar order. */
export function archiveMonths(root: Root, content: Content, today: LocalDate, start = dailyStart(root)): ArchiveMonth[] {
  const groups = new Map<string, ArchiveDay[]>();
  for (const date of archiveDates(today, start)) {
    const month = date.slice(0, 7);
    const list = groups.get(month) ?? [];
    list.push({ date, day: Number(date.slice(8)), status: dailyStatus(root, content, date) });
    groups.set(month, list);
  }
  return [...groups.entries()].map(([month, days]) => {
    days.sort((a, b) => a.day - b.day);
    const first = days[0]!.date;
    const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    return { month, offset, days };
  });
}
