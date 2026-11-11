/**
 * The content facts the iOS Maestro flows (e2e/ios/flows) assert on screen. If the quote DB, the
 * daily order or the goals change, this fails first, naming the facts to update in the flows.
 */
import { content } from '@/content/quotes';
import { dailyQuoteId } from '@/engine/daily';
import { goalsFor } from '@/engine/goals';
import { isSundaySpecial } from '@/game/awards';
import { dailyNumber, quoteFacts } from '@/game/teaser';

type Fact = { author: string; letters: number; words: number; century: number; initial: string; sunday: boolean; goals: string };

const FACTS: Record<string, Fact> = {
  // 02, 06, 07, 13: install day, a Sunday; tomorrow's teaser comes from 01-11.
  '2027-01-10': { author: 'Henry David Thoreau', letters: 47, words: 11, century: 1800, initial: 'H', sunday: true, goals: 'daily,clean,long' },
  '2027-01-11': { author: 'Henry David Thoreau', letters: 46, words: 9, century: 1800, initial: 'H', sunday: false, goals: 'daily,levels2,long' },
  '2027-01-12': { author: 'William Shakespeare', letters: 68, words: 14, century: 1600, initial: 'W', sunday: false, goals: 'daily,letters150,levels2' },
  '2027-01-16': { author: 'Benjamin Franklin', letters: 38, words: 10, century: 1700, initial: 'B', sunday: false, goals: 'daily,levels2,letters150' },
  '2027-01-17': { author: 'Benjamin Franklin', letters: 28, words: 7, century: 1700, initial: 'B', sunday: true, goals: 'daily,letters150,hard' },
  '2027-01-21': { author: 'Henry David Thoreau', letters: 46, words: 9, century: 1800, initial: 'H', sunday: false, goals: 'daily,hard,levels2' },
  '2027-01-24': { author: 'William Shakespeare', letters: 32, words: 9, century: 1600, initial: 'W', sunday: true, goals: 'daily,levels2,clean' },
  '2027-01-31': { author: 'Henry David Thoreau', letters: 46, words: 9, century: 1800, initial: 'H', sunday: true, goals: 'daily,clean,long' },
};

describe('facts the iOS flows rely on', () => {
  it.each(Object.entries(FACTS))('%s', (date, want) => {
    const q = content.quote(dailyQuoteId(date, content.dailyOrder))!;
    const f = quoteFacts(q);
    expect({
      author: q.author,
      letters: f.letters,
      words: f.words,
      century: f.century,
      initial: f.initial,
      sunday: isSundaySpecial(date),
      goals: goalsFor(date).join(','),
    }).toEqual(want);
  });

  it('numbers the dailies from 30 Oct 2026 (10 Jan 2027 is #73)', () => {
    expect(dailyNumber('2027-01-10')).toBe(73);
  });

  it('11 and 21 January share a quote (the daily wrap-around in 07-archive-stamps)', () => {
    expect(dailyQuoteId('2027-01-11', content.dailyOrder)).toBe(dailyQuoteId('2027-01-21', content.dailyOrder));
  });

  it('has 18 authors, and 20 levels worth 1,000+ letters (03c: "1,000 letters" after levels 1–20)', () => {
    expect(content.authors()).toHaveLength(18);
    const pool = content.levelPool as unknown as ({ id: number } | number)[];
    const letters = pool.map((e) => quoteFacts(content.quote(typeof e === 'number' ? e : e.id)!).letters);
    expect(letters).toHaveLength(20);
    expect(letters.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1000);
    // Long quotes (60+) exist among the levels, for the "long" goal.
    expect(letters.filter((n) => n >= 60).length).toBeGreaterThan(0);
  });
});
