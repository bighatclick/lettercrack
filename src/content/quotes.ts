/**
 * Quote content access. Today this reads the dev seed. Once `npm run quotes:build` has produced
 * assets/quotes.v1.json from the reviewed CSV, change the import below to it (same shape).
 */
import seed from '../../assets/quotes.seed.json';

import type { Difficulty } from '@/engine/puzzle';
import type { PoolQuote } from '@/engine/picker';
import type { AuthorSet } from '@/engine/wardrobe';

export type QuoteRecord = {
  id: number;
  text: string;
  author: string;
  authorDates: string;
  work: string;
  workYear: number;
  sourceCollection: string;
  sourceEdition: string;
  topics: string[];
  difficulty: Difficulty;
  /** Removed after review. Kept so its ID is never reused; never offered again. */
  retired?: boolean;
};

export type AuthorInfo = {
  dates: string;
  bio: string;
  /** Library set (Phase C). Authors without one are still collected, just in no set. */
  set?: AuthorSet;
  /** One short, checked "Did you know?" line. */
  fact?: string;
};

export type QuoteDb = {
  version: string;
  authors: Record<string, AuthorInfo>;
  dailyOrder: number[];
  quotes: QuoteRecord[];
};

/**
 * A retired daily is replaced by the next live ID in the order (wrapping), so only its own date
 * changes; every other date keeps its quote and the order's length never changes.
 */
export function liveDailyOrder(order: readonly number[], isLive: (id: number) => boolean): number[] {
  return order.map((id, i) => {
    if (isLive(id)) return id;
    for (let k = 1; k < order.length; k++) {
      const alt = order[(i + k) % order.length]!;
      if (isLive(alt)) return alt;
    }
    throw new Error('daily order has no live quotes');
  });
}

export function createContent(db: QuoteDb) {
  const byId = new Map(db.quotes.map((q) => [q.id, q]));
  const isLive = (id: number) => !!byId.get(id) && !byId.get(id)!.retired;
  const dailySet = new Set(db.dailyOrder);
  const levelPool: PoolQuote[] = db.quotes
    .filter((q) => !dailySet.has(q.id) && !q.retired)
    .map((q) => ({ id: q.id, length: q.text.length }));
  // Authors with at least one live quote: the Library only lists people a player can meet.
  const liveAuthors = [...new Set(db.quotes.filter((q) => !q.retired).map((q) => q.author))].sort((a, b) => a.localeCompare(b));
  return {
    version: db.version,
    dailyOrder: liveDailyOrder(db.dailyOrder, isLive),
    /** Daily-reserved IDs; never offered as levels. */
    dailySet,
    levelPool,
    quote(id: number): QuoteRecord | undefined {
      return byId.get(id);
    },
    author(name: string): AuthorInfo | undefined {
      return db.authors[name];
    },
    /** Every author with a live quote, A–Z. */
    authors(): readonly string[] {
      return liveAuthors;
    },
  };
}

export type Content = ReturnType<typeof createContent>;

export const content: Content = createContent(seed as QuoteDb);
