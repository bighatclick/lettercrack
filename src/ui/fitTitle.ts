/**
 * Average advance width of the hero font, in em, with a safety margin.
 * Measured: "codebreaker!" at 34 pt is about 180 dp wide, i.e. 0.44 em per character.
 */
export const HERO_CHAR_EM = 0.5;

/**
 * The largest font size, at most `size`, at which the title's longest word fits in `width`.
 * Large text must wrap between words, never inside one ("co / debreaker!").
 * Returns `size` unchanged until the column has been measured.
 */
export function fitTitleSize(title: string, width: number, size: number, em = HERO_CHAR_EM): number {
  if (width <= 0) return size;
  const longest = Math.max(0, ...title.split(/\s+/).map((w) => w.length));
  if (longest === 0) return size;
  return Math.min(size, Math.floor(width / (longest * em)));
}

/**
 * True when a laid-out title broke a line inside a word: a line other than the last that does
 * not end in whitespace or a dash ("codebreaker" then "!" on the next line).
 * `lines` are the line texts from onTextLayout, which keep the trailing space of a word wrap.
 */
export function splitsAWord(lines: readonly string[]): boolean {
  return lines.slice(0, -1).some((l) => l.length > 0 && !/[\s\-–—]$/.test(l));
}

/** Each correction step shrinks the title this much; it never goes below MIN_TITLE_SHRINK. */
export const TITLE_SHRINK_STEP = 0.92;
export const MIN_TITLE_SHRINK = 0.5;
