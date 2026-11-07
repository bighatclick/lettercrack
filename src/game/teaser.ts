/**
 * Spoiler-free facts about a daily quote, for tomorrow's teaser, reminder text and the share line.
 * Never reveals words of the quote; at most the era, the length and the author's initial.
 */
import type { Content, QuoteRecord } from '@/content/quotes';
import { addDays, dailyIndex, dailyQuoteId, type LocalDate } from '@/engine/daily';

export type QuoteFacts = {
  words: number;
  letters: number;
  /** Century the work was published in, e.g. 1800 for "the 1800s". */
  century: number;
  initial: string;
};

export function quoteFacts(q: QuoteRecord): QuoteFacts {
  const words = q.text.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  const letters = q.text.replace(/[^a-z]/gi, '').length;
  const century = Math.floor(q.workYear / 100) * 100;
  const initial = (q.author.match(/[A-Z]/)?.[0] ?? q.author[0] ?? '?').toUpperCase();
  return { words, letters, century, initial };
}

export function dailyFacts(content: Content, date: LocalDate): QuoteFacts | null {
  const q = content.quote(dailyQuoteId(date, content.dailyOrder));
  return q ? quoteFacts(q) : null;
}

/** Tomorrow's daily, described without spoilers. */
export const tomorrowFacts = (content: Content, today: LocalDate) => dailyFacts(content, addDays(today, 1));

/** The daily's number since launch (#1 on launch day), for the share line. */
export const dailyNumber = (date: LocalDate) => dailyIndex(date) + 1;

/** Reminder text variants rotate by date so the notification doesn't read the same every day. */
export const REMINDER_VARIANTS = 4;
export const reminderVariant = (date: LocalDate) => dailyIndex(date) % REMINDER_VARIANTS;

