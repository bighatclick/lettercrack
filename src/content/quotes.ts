/**
 * Quote content access. Today this reads the dev seed; Phase 2 swaps in assets/quotes.v1.json
 * (same shape) and nothing else changes.
 */
import seed from '../../assets/quotes.seed.json';

import type { Difficulty } from '@/engine/puzzle';
import type { PoolQuote } from '@/engine/picker';

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
};

export type AuthorInfo = { dates: string; bio: string };

export type QuoteDb = {
  version: string;
  authors: Record<string, AuthorInfo>;
  dailyOrder: number[];
  quotes: QuoteRecord[];
};

export function createContent(db: QuoteDb) {
  const byId = new Map(db.quotes.map((q) => [q.id, q]));
  const dailySet = new Set(db.dailyOrder);
  const levelPool: PoolQuote[] = db.quotes.filter((q) => !dailySet.has(q.id)).map((q) => ({ id: q.id, length: q.text.length }));
  return {
    version: db.version,
    dailyOrder: db.dailyOrder,
    /** Daily-reserved IDs; never offered as levels. */
    dailySet,
    levelPool,
    quote(id: number): QuoteRecord | undefined {
      return byId.get(id);
    },
    author(name: string): AuthorInfo | undefined {
      return db.authors[name];
    },
  };
}

export type Content = ReturnType<typeof createContent>;

export const content: Content = createContent(seed as QuoteDb);
