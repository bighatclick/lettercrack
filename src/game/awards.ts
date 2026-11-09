/**
 * Phases B and C, derived from saved progress: rank, the Library, the monthly stamp book,
 * Sunday specials, chapters, badges and the wardrobe unlocks. Pure (Root + Content in).
 */
import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { awardBadges, type BadgeFacts, type BadgeMoment } from '@/engine/badges';
import { chaptersDone } from '@/engine/chapters';
import { addDays, dayNumber, isoWeek, type LocalDate } from '@/engine/daily';
import { rankFor, ranksReached, type RankView } from '@/engine/rank';
import { AUTHOR_SETS, type AuthorSet, itemById, type UnlockFacts, unlockedItems } from '@/engine/wardrobe';

import { dailyStart, dailyStatus } from './archive';

const lettersOf = (text: string) => text.replace(/[^a-z]/gi, '').length;

/** XP = letters in every solved quote (each quote once). */
export function xpOf(root: Root, content: Content): number {
  let xp = 0;
  for (const id of Object.keys(root.progress.solved)) {
    const q = content.quote(Number(id));
    if (q) xp += lettersOf(q.text);
  }
  return xp;
}

export const rankOf = (root: Root, content: Content): RankView => rankFor(xpOf(root, content));

/** Authors the player has solved at least one quote by. */
export function collectedAuthors(root: Root, content: Content): Set<string> {
  const out = new Set<string>();
  for (const id of Object.keys(root.progress.solved)) {
    const q = content.quote(Number(id));
    if (q) out.add(q.author);
  }
  return out;
}

export type LibrarySet = { set: AuthorSet; authors: string[]; collected: number; done: boolean };

/** The Library: each set with its authors (A–Z) and how many are collected. Empty sets are left out. */
export function library(root: Root, content: Content): { sets: LibrarySet[]; collected: Set<string>; total: number } {
  const collected = collectedAuthors(root, content);
  const all = content.authors();
  const sets = AUTHOR_SETS.map((set) => {
    const authors = all.filter((a) => content.author(a)?.set === set);
    const n = authors.filter((a) => collected.has(a)).length;
    return { set, authors, collected: n, done: authors.length > 0 && n === authors.length };
  }).filter((s) => s.authors.length > 0);
  return { sets, collected, total: all.length };
}

export const setsDone = (root: Root, content: Content): AuthorSet[] =>
  library(root, content)
    .sets.filter((s) => s.done)
    .map((s) => s.set);

/** Sundays are Sunday specials: a longer quote with its own badge. */
export const isSundaySpecial = (date: LocalDate): boolean => new Date(dayNumber(date) * 86_400_000).getUTCDay() === 0;

/** Every daily date (player's first day … today) whose daily is solved, on the day or later. */
export function solvedDailyDates(root: Root, content: Content, today: LocalDate, start = dailyStart(root)): LocalDate[] {
  if (today < start) return [];
  const out: LocalDate[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (dailyStatus(root, content, d) === 'solved') out.push(d);
  }
  return out;
}

export type StampMonth = { month: string; days: number; stamps: number; medal: boolean };

/**
 * Monthly stamp book: one stamp per solved daily; a medal for a full calendar month. Newest first.
 * The player's first month starts on their first day (`start`), so it can still earn a medal.
 */
export function stampBook(solvedDailies: readonly LocalDate[], today: LocalDate, start: LocalDate): StampMonth[] {
  if (today < start) return [];
  const byMonth = new Map<string, number>();
  for (const d of solvedDailies) byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) ?? 0) + 1);
  const out: StampMonth[] = [];
  let m = start.slice(0, 7);
  const last = today.slice(0, 7);
  while (m <= last) {
    const [y, mo] = m.split('-').map(Number) as [number, number];
    const inMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const days = m === start.slice(0, 7) ? inMonth - Number(start.slice(8)) + 1 : inMonth;
    const stamps = byMonth.get(m) ?? 0;
    out.push({ month: m, days, stamps, medal: stamps >= days });
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  }
  return out.reverse();
}

function perfectWeeks(solvedOnDay: readonly LocalDate[]): number {
  const weeks = new Map<string, Set<LocalDate>>();
  for (const d of solvedOnDay) {
    const w = isoWeek(d);
    const set = weeks.get(w) ?? new Set<LocalDate>();
    set.add(d);
    weeks.set(w, set);
  }
  return [...weeks.values()].filter((s) => s.size >= 7).length;
}

export function badgeFacts(root: Root, content: Content, today: LocalDate): BadgeFacts {
  const recs = Object.values(root.progress.solved);
  const dailies = solvedDailyDates(root, content, today);
  const onDay = new Set(root.daily.solvedDates);
  return {
    solves: recs.length,
    clean: recs.filter((r) => r.clean).length,
    letters: xpOf(root, content),
    hardSolves: recs.filter((r) => r.difficulty === 'hard' || r.difficulty === 'expert').length,
    expertSolves: recs.filter((r) => r.difficulty === 'expert').length,
    bestStreak: root.daily.best,
    dailies: Math.max(dailies.length, onDay.size),
    archiveSolves: dailies.filter((d) => !onDay.has(d)).length,
    perfectWeeks: perfectWeeks(root.daily.solvedDates),
    authors: collectedAuthors(root, content).size,
    setsDone: setsDone(root, content).length,
    chaptersDone: chaptersDone(root.progress.levelIndex),
    monthMedals: stampBook(dailies, today, dailyStart(root)).filter((m) => m.medal).length,
    sundays: dailies.filter(isSundaySpecial).length,
  };
}

export function unlockFacts(root: Root, content: Content): UnlockFacts {
  return { ranks: ranksReached(xpOf(root, content)), badges: root.awards.earned, sets: setsDone(root, content) };
}

/** Awards any badges now due. Returns the same root when nothing changed. */
export function refreshAwards(root: Root, content: Content, today: LocalDate, moment?: BadgeMoment): { root: Root; fresh: string[] } {
  const r = awardBadges(root.awards.earned, today, badgeFacts(root, content, today), moment);
  if (r.fresh.length === 0) return { root, fresh: [] };
  return { root: { ...root, awards: { ...root.awards, earned: r.earned } }, fresh: r.fresh };
}

export type AwardKey = `badge:${string}` | `rank:${string}` | `item:${string}`;

/** Everything the player has unlocked so far, as "seen" keys: badges, ranks above Rookie, earned items. */
export function currentAwardKeys(root: Root, content: Content): AwardKey[] {
  const f = unlockFacts(root, content);
  return [
    ...Object.keys(root.awards.earned).map((id) => `badge:${id}` as const),
    ...f.ranks.filter((r) => r !== 'rookie').map((r) => `rank:${r}` as const),
    ...unlockedItems(f)
      .filter((id) => itemById(id)?.unlock.kind !== 'free')
      .map((id) => `item:${id}` as const),
  ];
}

/** Awards not yet shown to the player. */
export function unseenAwards(root: Root, content: Content): AwardKey[] {
  const seen = new Set(root.awards.seen);
  return currentAwardKeys(root, content).filter((k) => !seen.has(k));
}

export function markAwardsSeen(root: Root, keys: readonly string[]): Root {
  const seen = new Set(root.awards.seen);
  const add = keys.filter((k) => !seen.has(k));
  if (add.length === 0) return root;
  return { ...root, awards: { ...root.awards, seen: [...root.awards.seen, ...add] } };
}
