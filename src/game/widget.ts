/**
 * Home-screen widget snapshot (Phase D). Pure: the next few days' cipher preview, whether each
 * daily is solved and the streak the app would show on that day. The native widget picks the
 * entry for the device's date, so it stays right after midnight without the app opening.
 */
import type { Content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { dailySeed, encrypt, makeCipherKey } from '@/engine/cipher';
import { addDays, type LocalDate } from '@/engine/daily';
import { displayStreak } from '@/engine/streak';

import { dailyStatus } from './archive';
import { dailyRef } from './session';

/** Days ahead covered by one snapshot. */
export const WIDGET_DAYS = 7;

/** The first words of a date's daily, in code: no spoilers. */
export function cipherPreview(date: LocalDate, content: Content, maxLetters = 16): { words: string[]; more: boolean; letters: number } | null {
  const ref = dailyRef(date, content, date);
  const q = ref ? content.quote(ref.quoteId) : undefined;
  if (!q) return null;
  const words = encrypt(q.text, makeCipherKey(dailySeed(date)))
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z]/g, ''))
    .filter(Boolean);
  const shown: string[] = [];
  let n = 0;
  for (const w of words) {
    if (n + w.length > maxLetters && shown.length) break;
    shown.push(w);
    n += w.length;
  }
  return { words: shown, more: shown.length < words.length, letters: q.text.replace(/[^a-z]/gi, '').length };
}

export type WidgetStrings = {
  title: string;
  play: string;
  solved: string;
  newDay: string;
};

/** `streakLabel` is already translated ("12-day streak"), empty with no streak. */
export type WidgetDay = { cipher: string; solved: boolean; streak: number; streakLabel: string };
export type WidgetPayload = { v: 1; days: Record<LocalDate, WidgetDay>; strings: WidgetStrings };

export function widgetPayload(
  root: Root,
  content: Content,
  today: LocalDate,
  strings: WidgetStrings,
  streakLabel: (count: number) => string,
): WidgetPayload {
  const days: Record<LocalDate, WidgetDay> = {};
  for (let i = 0; i < WIDGET_DAYS; i++) {
    const d = addDays(today, i);
    const p = cipherPreview(d, content, 14);
    if (!p) continue;
    const streak = displayStreak(root.daily, d);
    days[d] = {
      cipher: p.words.join(' ') + (p.more ? ' …' : ''),
      solved: root.daily.solvedDates.includes(d) || (d <= today && dailyStatus(root, content, d) === 'solved'),
      streak,
      streakLabel: streak > 0 ? streakLabel(streak) : '',
    };
  }
  return { v: 1, days, strings };
}
