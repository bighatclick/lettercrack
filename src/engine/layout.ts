/**
 * Word wrapping for the puzzle board (F2). Every character is one cell (monospace), and words
 * are separated by one blank cell.
 *
 * Rules:
 * - A word is a maximal run of non-whitespace, so apostrophes, hyphens, dashes and trailing
 *   punctuation stay attached to their word.
 * - A word that fits on a line is never split.
 * - A word longer than a whole line starts on a fresh line and breaks after a hyphen or dash
 *   where possible; only if no dash fits is it hard-split (counted in `forcedBreaks`).
 */

/** Half-open range `[start, end)` into the original text. */
export type Token = { start: number; end: number };
export type LayoutLine = Token[];
export type Layout = { lines: LayoutLine[]; forcedBreaks: number };

const BREAK_AFTER = new Set(['-', '‐', '‑', '‒', '–', '—', '―']);

export function lineWidth(line: LayoutLine): number {
  return line.reduce((w, t, i) => w + (t.end - t.start) + (i > 0 ? 1 : 0), 0);
}

export function layoutText(text: string, maxCells: number): Layout {
  if (!Number.isInteger(maxCells) || maxCells < 1) throw new Error(`maxCells must be a positive integer, got ${maxCells}`);

  const lines: LayoutLine[] = [];
  let line: LayoutLine = [];
  let used = 0;
  let forcedBreaks = 0;

  const newLine = () => {
    if (line.length) lines.push(line);
    line = [];
    used = 0;
  };
  const place = (t: Token) => {
    used += (line.length ? 1 : 0) + (t.end - t.start);
    line.push(t);
  };

  for (const m of text.matchAll(/\S+/g)) {
    const start = m.index;
    const end = start + m[0].length;
    const len = end - start;

    if ((line.length ? used + 1 : 0) + len <= maxCells) {
      place({ start, end });
      continue;
    }
    if (len <= maxCells) {
      newLine();
      place({ start, end });
      continue;
    }

    // Longer than a whole line: fill the space left on this line with pieces ending at a dash.
    let pos = start;
    for (;;) {
      const room = line.length ? maxCells - used - 1 : maxCells;
      if (end - pos <= room) {
        place({ start: pos, end });
        break;
      }
      let cut = -1;
      for (let i = pos + room - 1; i > pos; i--) {
        if (BREAK_AFTER.has(text[i] as string)) {
          cut = i + 1;
          break;
        }
      }
      if (cut === -1) {
        if (line.length) {
          newLine(); // no dash fits in the leftover space; retry on a fresh line
          continue;
        }
        cut = pos + maxCells;
        forcedBreaks++;
      }
      place({ start: pos, end: cut });
      newLine();
      pos = cut;
    }
  }
  newLine();
  return { lines, forcedBreaks };
}
