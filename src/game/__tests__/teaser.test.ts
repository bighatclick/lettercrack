import { content } from '@/content/quotes';
import { addDays } from '@/engine/daily';

import { dailyFacts, quoteFacts, REMINDER_VARIANTS, reminderVariant, tomorrowFacts } from '../teaser';

const rec = {
  id: 1,
  text: "Well done is better than well said. It's true!",
  author: 'Benjamin Franklin',
  authorDates: '1706–1790',
  work: 'W',
  workYear: 1737,
  sourceCollection: 'S',
  sourceEdition: 'E',
  topics: [],
  difficulty: 'easy' as const,
};

describe('spoiler-free quote facts', () => {
  it('counts words and letters, and gives only the century and initial', () => {
    expect(quoteFacts(rec)).toEqual({ words: 9, letters: 35, century: 1700, initial: 'B' });
  });

  it("describes tomorrow's daily", () => {
    const today = '2027-02-01';
    expect(tomorrowFacts(content, today)).toEqual(dailyFacts(content, addDays(today, 1)));
    expect(tomorrowFacts(content, today)?.words).toBeGreaterThan(0);
  });

  it('rotates reminder text by date', () => {
    const seen = new Set(Array.from({ length: 8 }, (_, i) => reminderVariant(addDays('2027-01-01', i))));
    expect(seen.size).toBe(REMINDER_VARIANTS);
  });
});
