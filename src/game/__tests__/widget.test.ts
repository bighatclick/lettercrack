import { content } from '@/content/quotes';
import { defaultRoot } from '@/data/schema';
import { dailyQuoteId } from '@/engine/daily';

import { cipherPreview, WIDGET_DAYS, widgetPayload } from '../widget';

const strings = { title: 'LetterCrack', play: 'Play', solved: 'Solved', newDay: 'New' };
const label = (n: number) => `${n}-day streak`;

describe('home-screen widget snapshot', () => {
  it('covers the next week with cipher text only (no spoilers)', () => {
    const p = widgetPayload(defaultRoot(0), content, '2027-01-10', strings, label);
    expect(Object.keys(p.days)).toHaveLength(WIDGET_DAYS);
    expect(Object.keys(p.days)[0]).toBe('2027-01-10');
    const plain = content.quote(dailyQuoteId('2027-01-10', content.dailyOrder))!.text.toUpperCase();
    const first = p.days['2027-01-10']!.cipher.split(' ')[0]!;
    expect(first).toMatch(/^[A-Z]+$/);
    expect(plain.startsWith(first)).toBe(false);
    expect(p.strings).toEqual(strings);
  });

  it('marks today solved and carries the streak the app would show', () => {
    const r = defaultRoot(0);
    r.daily = { ...r.daily, streak: 4, best: 4, solvedDates: ['2027-01-07', '2027-01-08', '2027-01-09', '2027-01-10'] };
    const p = widgetPayload(r, content, '2027-01-10', strings, label);
    expect(p.days['2027-01-10']).toMatchObject({ solved: true, streak: 4, streakLabel: '4-day streak' });
    expect(p.days['2027-01-11']).toMatchObject({ solved: false, streak: 4 });
  });

  it('shows no streak label without a streak', () => {
    const p = widgetPayload(defaultRoot(0), content, '2027-01-10', strings, label);
    expect(p.days['2027-01-10']).toMatchObject({ solved: false, streak: 0, streakLabel: '' });
  });

  it('previews only the first words of a quote', () => {
    const p = cipherPreview('2027-01-10', content, 5)!;
    expect(p.words.length).toBeGreaterThan(0);
    expect(p.letters).toBeGreaterThan(5);
  });
});
