import { layoutText, lineWidth } from '../layout';
import { sampleQuotes } from './fixtures/sampleQuotes';

/** 8–11 cells is roughly XXL text on a small iPhone; 40 is a regular-size iPad line. */
const WIDTHS = [6, 8, 9, 10, 11, 12, 14, 16, 20, 28, 40];

const words = (text: string) => [...text.matchAll(/\S+/g)].map((m) => ({ start: m.index, end: m.index + m[0].length }));

describe('layoutText (F2)', () => {
  it('uses 50 sample quotes', () => expect(sampleQuotes).toHaveLength(50));

  describe.each(WIDTHS)('at %i cells per line', (width) => {
    it.each(sampleQuotes.map((q) => [q]))('%s', (text) => {
      const { lines, forcedBreaks } = layoutText(text, width);

      // Nothing lost, duplicated or reordered.
      const rebuilt = lines.flat().map((t) => text.slice(t.start, t.end)).join('');
      expect(rebuilt).toBe(text.replace(/\s+/g, ''));

      // No line overflows, and no empty lines.
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(0);
        expect(lineWidth(line)).toBeLessThanOrEqual(width);
      }

      // A word that fits on a line is never split.
      const tokens = new Set(lines.flat().map((t) => `${t.start}:${t.end}`));
      for (const w of words(text)) {
        if (w.end - w.start <= width) expect(tokens.has(`${w.start}:${w.end}`)).toBe(true);
      }

      // Lines are filled greedily: the first word of the next line would not have fitted.
      for (let i = 0; i + 1 < lines.length; i++) {
        const next = lines[i + 1]![0]!;
        expect(lineWidth(lines[i]!) + 1 + (next.end - next.start)).toBeGreaterThan(width);
      }

      expect(forcedBreaks).toBeGreaterThanOrEqual(0);
    });
  });

  it('keeps apostrophes, quotes and trailing punctuation with their word', () => {
    const text = "Don't stop—'tis \"well\" said.";
    const { lines } = layoutText(text, 7);
    const pieces = lines.map((l) => l.map((t) => text.slice(t.start, t.end)));
    expect(pieces.flat()).toContain("Don't");
    expect(pieces.flat()).toContain('"well"');
    expect(pieces.flat()).toContain('said.');
  });

  it('breaks an over-long word after a hyphen or dash, not mid-word', () => {
    const text = 'a never-say-die spirit';
    const { lines, forcedBreaks } = layoutText(text, 8);
    // "never-" uses the space left after "a"; the rest goes on the next line.
    expect(lines.map((l) => l.map((t) => text.slice(t.start, t.end)).join(' '))).toEqual([
      'a never-',
      'say-die',
      'spirit',
    ]);
    expect(forcedBreaks).toBe(0);
  });

  it('hard-splits only a dash-free word longer than the line, and counts it', () => {
    const text = 'incomprehensibilities';
    const { lines, forcedBreaks } = layoutText(text, 8);
    expect(lines.map((l) => text.slice(l[0]!.start, l[0]!.end))).toEqual(['incompre', 'hensibil', 'ities']);
    expect(forcedBreaks).toBe(2);
  });

  it('handles empty and whitespace-only text', () => {
    expect(layoutText('', 10).lines).toEqual([]);
    expect(layoutText('   ', 10).lines).toEqual([]);
  });

  it('rejects a non-positive width', () => {
    expect(() => layoutText('a', 0)).toThrow();
  });
});
