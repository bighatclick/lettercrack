import type { Difficulty } from './puzzle';

/**
 * Level quote picker (rule 6, F6): never repeat a quote until the pool is exhausted.
 * Order of preference:
 *   1. unseen quotes whose length suits the difficulty, in pool order;
 *   2. any unseen quote, in pool order (a short pool for one band never forces a repeat);
 *   3. once everything has been seen: the quote seen longest ago (in-band first).
 * Daily-reserved and reported quotes are excluded by the caller via `exclude`.
 */

export type PoolQuote = { id: number; length: number };

/** Quote length bands per difficulty (specs.md §5: Easy ≤ 80 chars, Expert 100–160). */
export const LENGTH_BANDS: Record<Difficulty, readonly [number, number]> = {
  easy: [40, 80],
  medium: [40, 120],
  hard: [60, 160],
  expert: [100, 160],
};

export const fitsDifficulty = (q: PoolQuote, d: Difficulty) =>
  q.length >= LENGTH_BANDS[d][0] && q.length <= LENGTH_BANDS[d][1];

export type PickArgs = {
  /** Level pool in its fixed asset order. */
  pool: readonly PoolQuote[];
  /** Seen IDs, oldest first (see markSeen). */
  seen: readonly number[];
  exclude?: ReadonlySet<number>;
  difficulty?: Difficulty;
};

export function pickNextQuote({ pool, seen, exclude, difficulty }: PickArgs): number | null {
  const eligible = exclude ? pool.filter((q) => !exclude.has(q.id)) : pool;
  if (eligible.length === 0) return null;
  const inBand = (q: PoolQuote) => !difficulty || fitsDifficulty(q, difficulty);
  const seenSet = new Set(seen);

  const unseen = eligible.filter((q) => !seenSet.has(q.id));
  const fresh = unseen.find(inBand) ?? unseen[0];
  if (fresh) return fresh.id;

  // Everything seen: oldest-seen first.
  const byId = new Map(eligible.map((q) => [q.id, q]));
  let fallback: number | null = null;
  for (const id of seen) {
    const q = byId.get(id);
    if (!q) continue;
    if (inBand(q)) return id;
    fallback ??= id;
  }
  return fallback;
}

/** Records a quote as seen: moved to the end, so `seen` stays ordered oldest → newest. */
export function markSeen(seen: readonly number[], id: number): number[] {
  return [...seen.filter((x) => x !== id), id];
}
