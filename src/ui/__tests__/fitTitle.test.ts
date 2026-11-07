import { fitTitleSize, HERO_CHAR_EM, splitsAWord } from '../fitTitle';

describe('splitsAWord', () => {
  it('accepts wraps between words', () => {
    expect(splitsAWord(['Good ', 'afternoon, ', 'codebreaker!'])).toBe(false);
    expect(splitsAWord(['Settings'])).toBe(false);
    expect(splitsAWord(['well-', 'known'])).toBe(false);
  });

  it('catches a break inside a word, including before trailing punctuation', () => {
    expect(splitsAWord(['Good afternoon, c', 'odebreaker!'])).toBe(true);
    expect(splitsAWord(['Good ', 'afternoon, ', 'codebreaker', '!'])).toBe(true);
  });
});

describe('fitTitleSize', () => {
  it('keeps the requested size when the longest word fits', () => {
    // Pixel 7 at default text size: the title column next to Inky is about 250 dp.
    expect(fitTitleSize('Good morning, codebreaker!', 250, 34)).toBe(34);
  });

  it('shrinks just enough that the longest word fits at the largest text size', () => {
    // Android font scale 2.0: 68 pt would split "codebreaker!" mid-word.
    const size = fitTitleSize('Good morning, codebreaker!', 250, 68);
    expect(size).toBeLessThan(68);
    expect('codebreaker!'.length * HERO_CHAR_EM * size).toBeLessThanOrEqual(250);
  });

  it('never grows the text beyond the requested size', () => {
    expect(fitTitleSize('Stats', 2000, 34)).toBe(34);
  });

  it('leaves the size alone until the column is measured, or for empty titles', () => {
    expect(fitTitleSize('Good morning, codebreaker!', 0, 68)).toBe(68);
    expect(fitTitleSize('', 250, 34)).toBe(34);
  });
});
