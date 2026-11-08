/**
 * Codebreaker rank. Every letter decoded in a solved quote earns 1 XP (a quote counts once,
 * however often it is replayed), so rank only ever goes up. Never bought, never lost.
 */
export const RANKS = [
  { id: 'rookie', xp: 0 },
  { id: 'apprentice', xp: 500 },
  { id: 'sleuth', xp: 2000 },
  { id: 'cryptographer', xp: 6000 },
  { id: 'master', xp: 15000 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

export type RankView = {
  rank: RankId;
  /** 0-based position in RANKS. */
  index: number;
  xp: number;
  /** The next rank, or null at the top. */
  next: RankId | null;
  /** XP still needed for the next rank (0 at the top). */
  toNext: number;
  /** Progress from this rank to the next, 0–1 (1 at the top). */
  progress: number;
};

export function rankFor(xp: number): RankView {
  const safe = Math.max(0, Math.floor(xp));
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (safe >= RANKS[i]!.xp) index = i;
  const cur = RANKS[index]!;
  const nxt = RANKS[index + 1];
  if (!nxt) return { rank: cur.id, index, xp: safe, next: null, toNext: 0, progress: 1 };
  return {
    rank: cur.id,
    index,
    xp: safe,
    next: nxt.id,
    toNext: nxt.xp - safe,
    progress: (safe - cur.xp) / (nxt.xp - cur.xp),
  };
}

/** Ranks reached at this XP (rookie included). */
export const ranksReached = (xp: number): RankId[] => RANKS.filter((r) => xp >= r.xp).map((r) => r.id);
