/**
 * Chapters on the level path: every 10 levels is a new area with its own colours. Visual only,
 * no storyline. The last level of each chapter is a "big quote" level (a longer quote), and
 * finishing it stamps the chapter.
 */
export const LEVELS_PER_CHAPTER = 10;

/** Chapter names cycle after the last one; the number keeps counting. */
export const CHAPTER_THEMES = [
  { id: 'meadow', gradient: 'lagoon', hue: 3 },
  { id: 'lanterns', gradient: 'sunshine', hue: 1 },
  { id: 'harbour', gradient: 'sky', hue: 4 },
  { id: 'orchard', gradient: 'candy', hue: 0 },
  { id: 'observatory', gradient: 'night', hue: 5 },
  { id: 'gardens', gradient: 'lagoon', hue: 2 },
] as const;

export type ChapterTheme = (typeof CHAPTER_THEMES)[number];

/** 1-based chapter for a 1-based level number. */
export const chapterOf = (level: number): number => Math.floor((Math.max(1, level) - 1) / LEVELS_PER_CHAPTER) + 1;

export const chapterTheme = (chapter: number): ChapterTheme => CHAPTER_THEMES[(Math.max(1, chapter) - 1) % CHAPTER_THEMES.length]!;

/** The last level of every chapter is a big-quote level. */
export const isBigQuoteLevel = (level: number): boolean => level > 0 && level % LEVELS_PER_CHAPTER === 0;

/** Chapters fully finished after `levelsSolved` levels. */
export const chaptersDone = (levelsSolved: number): number => Math.floor(Math.max(0, levelsSolved) / LEVELS_PER_CHAPTER);

/** Position inside the chapter, 1–10. */
export const levelInChapter = (level: number): number => ((Math.max(1, level) - 1) % LEVELS_PER_CHAPTER) + 1;
