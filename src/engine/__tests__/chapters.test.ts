import { chapterOf, chaptersDone, chapterTheme, CHAPTER_THEMES, isBigQuoteLevel, levelInChapter } from '../chapters';

describe('chapters', () => {
  it('groups levels in tens', () => {
    expect(chapterOf(1)).toBe(1);
    expect(chapterOf(10)).toBe(1);
    expect(chapterOf(11)).toBe(2);
    expect(levelInChapter(10)).toBe(10);
    expect(levelInChapter(11)).toBe(1);
  });

  it('makes every tenth level a big quote', () => {
    expect(isBigQuoteLevel(10)).toBe(true);
    expect(isBigQuoteLevel(20)).toBe(true);
    expect(isBigQuoteLevel(9)).toBe(false);
    expect(isBigQuoteLevel(0)).toBe(false);
  });

  it('counts finished chapters from levels solved', () => {
    expect(chaptersDone(9)).toBe(0);
    expect(chaptersDone(10)).toBe(1);
    expect(chaptersDone(57)).toBe(5);
  });

  it('cycles themes after the last one', () => {
    expect(chapterTheme(CHAPTER_THEMES.length + 1)).toBe(CHAPTER_THEMES[0]);
  });
});
