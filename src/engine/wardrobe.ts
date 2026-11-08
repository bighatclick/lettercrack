/**
 * Inky's wardrobe: hats, glasses, neckwear and backdrops. Every item is earned through ranks,
 * badges or finished Library sets, never bought (hard rule 9). Unlocks are derived from
 * progress that only grows, so an item can never be lost once unlocked.
 */
import type { RankId } from './rank';

export type Slot = 'hat' | 'face' | 'neck' | 'bg';
export const SLOTS: readonly Slot[] = ['hat', 'face', 'neck', 'bg'];

export type AuthorSet = 'poets' | 'novelists' | 'playwrights' | 'thinkers' | 'scientists' | 'leaders' | 'essayists';
export const AUTHOR_SETS: readonly AuthorSet[] = ['poets', 'novelists', 'playwrights', 'thinkers', 'scientists', 'leaders', 'essayists'];

export type Unlock = { kind: 'free' } | { kind: 'rank'; rank: RankId } | { kind: 'badge'; badge: string } | { kind: 'set'; set: AuthorSet };

export type Item = { id: string; slot: Slot; unlock: Unlock };

export const ITEMS: readonly Item[] = [
  { id: 'beret', slot: 'hat', unlock: { kind: 'rank', rank: 'apprentice' } },
  { id: 'deerstalker', slot: 'hat', unlock: { kind: 'rank', rank: 'sleuth' } },
  { id: 'tophat', slot: 'hat', unlock: { kind: 'rank', rank: 'cryptographer' } },
  { id: 'crown', slot: 'hat', unlock: { kind: 'rank', rank: 'master' } },
  { id: 'partyhat', slot: 'hat', unlock: { kind: 'badge', badge: 'streak_7' } },
  { id: 'laurel', slot: 'hat', unlock: { kind: 'set', set: 'poets' } },
  { id: 'mortarboard', slot: 'hat', unlock: { kind: 'set', set: 'thinkers' } },
  { id: 'monocle', slot: 'face', unlock: { kind: 'free' } },
  { id: 'specs', slot: 'face', unlock: { kind: 'set', set: 'novelists' } },
  { id: 'shades', slot: 'face', unlock: { kind: 'badge', badge: 'night_owl' } },
  { id: 'goggles', slot: 'face', unlock: { kind: 'set', set: 'scientists' } },
  { id: 'bowtie', slot: 'neck', unlock: { kind: 'badge', badge: 'solves_50' } },
  { id: 'scarf', slot: 'neck', unlock: { kind: 'badge', badge: 'streak_30' } },
  { id: 'medal', slot: 'neck', unlock: { kind: 'badge', badge: 'month_medal' } },
  { id: 'ruff', slot: 'neck', unlock: { kind: 'set', set: 'playwrights' } },
  { id: 'sash', slot: 'neck', unlock: { kind: 'set', set: 'leaders' } },
  { id: 'stars', slot: 'bg', unlock: { kind: 'badge', badge: 'first_clean' } },
  { id: 'sunrise', slot: 'bg', unlock: { kind: 'badge', badge: 'early_bird' } },
  { id: 'books', slot: 'bg', unlock: { kind: 'set', set: 'essayists' } },
  { id: 'confetti', slot: 'bg', unlock: { kind: 'badge', badge: 'streak_100' } },
  { id: 'hearts', slot: 'bg', unlock: { kind: 'badge', badge: 'clean_50' } },
];

export type Outfit = { hat: string | null; face: string | null; neck: string | null; bg: string | null };
export const DEFAULT_OUTFIT: Outfit = { hat: null, face: 'monocle', neck: null, bg: null };

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);

export type UnlockFacts = { ranks: readonly RankId[]; badges: Readonly<Record<string, unknown>>; sets: readonly AuthorSet[] };

export function isUnlocked(item: Item, f: UnlockFacts): boolean {
  switch (item.unlock.kind) {
    case 'free':
      return true;
    case 'rank':
      return f.ranks.includes(item.unlock.rank);
    case 'badge':
      return !!f.badges[item.unlock.badge];
    case 'set':
      return f.sets.includes(item.unlock.set);
  }
}

export const unlockedItems = (f: UnlockFacts): string[] => ITEMS.filter((i) => isUnlocked(i, f)).map((i) => i.id);

/** Puts an item on (or takes it off when `id` is null). Locked or unknown items are refused. */
export function wear(outfit: Outfit, slot: Slot, id: string | null, f: UnlockFacts): Outfit {
  if (id === null) return { ...outfit, [slot]: null };
  const item = itemById(id);
  if (!item || item.slot !== slot || !isUnlocked(item, f)) return outfit;
  return { ...outfit, [slot]: id };
}

/** What to draw: anything no longer valid (renamed item, wrong slot) is dropped. */
export function sanitizeOutfit(o: Partial<Outfit> | null | undefined): Outfit {
  const out: Outfit = { ...DEFAULT_OUTFIT };
  for (const slot of SLOTS) {
    const v = o?.[slot];
    if (v === null) out[slot] = null;
    else if (typeof v === 'string' && itemById(v)?.slot === slot) out[slot] = v;
  }
  return out;
}
