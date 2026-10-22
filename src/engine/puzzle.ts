import { encrypt, isPlainLetter, makeCipherKey, normalizeQuote } from './cipher';
import { createRng, randInt, shuffle } from './rng';

/**
 * The puzzle reducer (specs.md §5). Pure: (state, action) → state; returns the SAME object
 * when an action changes nothing, so React can skip re-renders.
 *
 * Model: one entry per character of the quote. Letter cells hold the player's guess or ''.
 * Non-letter cells (spaces, punctuation, digits) always hold ''.
 * With auto-fill on, typing fills every cell that shares the selected cipher letter.
 * No lives and no fail state: wrong letters are only shown after Check or once the board is full.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type PuzzleInit = {
  text: string;
  /** levelSeed(quoteId) or dailySeed(date). */
  seed: string;
  difficulty: Difficulty;
  autoFill: boolean;
};

export type PuzzleState = {
  /** Normalised quote (A–Z uppercase). */
  plain: string;
  /** Encrypted quote, same length. */
  cipher: string;
  entries: string[];
  /** Cipher letters pre-filled by difficulty. Locked. */
  givens: string[];
  /** Cipher letters revealed by a hint. Locked. */
  revealed: string[];
  /** Index of the selected cell (always a letter cell), or null. */
  selected: number | null;
  autoFill: boolean;
  /** Cells marked wrong by the last Check; cleared as they are edited. */
  checkedWrong: number[];
  hintsUsed: number;
  checksUsed: number;
  elapsedMs: number;
  /** Last keyboard event id applied; repeats are ignored (F3: debounce by key id, not by time). */
  lastKeyId: number | null;
  solved: boolean;
};

export type PuzzleAction =
  | { type: 'select'; index: number }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'input'; letter: string; keyId: number }
  | { type: 'erase'; keyId: number }
  | { type: 'reveal' }
  | { type: 'check' }
  | { type: 'setAutoFill'; on: boolean }
  | { type: 'elapsed'; ms: number };

/** What gets persisted after every key (F4). */
export type PuzzleSnapshot = {
  entries: string[];
  revealed: string[];
  hintsUsed: number;
  checksUsed: number;
  elapsedMs: number;
};

const GIVENS: Record<Difficulty, (rng: () => number) => number> = {
  easy: (rng) => 3 + randInt(rng, 2),
  medium: () => 2,
  hard: () => 1,
  expert: () => 0,
};

export const isLetterCell = (s: Pick<PuzzleState, 'plain'>, i: number) => isPlainLetter(s.plain[i]);
const cipherAt = (s: PuzzleState, i: number) => s.cipher[i] as string;
const isLocked = (s: PuzzleState, i: number) => s.givens.includes(cipherAt(s, i)) || s.revealed.includes(cipherAt(s, i));

/** Distinct plain letters → cipher letters to pre-fill. Always leaves at least 2 letters to solve. */
export function chooseGivens(plain: string, cipher: string, difficulty: Difficulty, seed: string): string[] {
  const rng = createRng(`givens:${seed}:${difficulty}`);
  const distinct = [...new Set(plain.replace(/[^A-Z]/g, ''))].sort();
  const n = Math.min(GIVENS[difficulty](rng), Math.max(0, distinct.length - 2));
  const chosen = shuffle(distinct, rng).slice(0, n);
  return chosen.map((p) => cipher[plain.indexOf(p)] as string).sort();
}

function fillCipherLetters(entries: string[], s: PuzzleState, cipherLetters: string[]): string[] {
  const out = entries.slice();
  for (let i = 0; i < out.length; i++) {
    if (cipherLetters.includes(cipherAt(s, i))) out[i] = s.plain[i] as string;
  }
  return out;
}

function isSolved(s: Pick<PuzzleState, 'plain' | 'entries'>): boolean {
  for (let i = 0; i < s.plain.length; i++) {
    if (isPlainLetter(s.plain[i]) && s.entries[i] !== s.plain[i]) return false;
  }
  return true;
}

/** Next letter cell after `from` in direction `delta` matching `pred`, wrapping once. */
function findCell(s: PuzzleState, from: number, delta: 1 | -1, pred: (i: number) => boolean, wrap = true): number | null {
  const n = s.plain.length;
  for (let step = 1; step <= n; step++) {
    const raw = from + step * delta;
    if (!wrap && (raw < 0 || raw >= n)) return null;
    const i = ((raw % n) + n) % n;
    if (isLetterCell(s, i) && pred(i)) return i;
  }
  return null;
}

const isOpen = (s: PuzzleState) => (i: number) => !isLocked(s, i) && s.entries[i] === '';

export function createPuzzle(init: PuzzleInit): PuzzleState {
  const plain = normalizeQuote(init.text);
  const cipher = encrypt(plain, makeCipherKey(init.seed));
  const givens = chooseGivens(plain, cipher, init.difficulty, init.seed);
  const base: PuzzleState = {
    plain,
    cipher,
    entries: new Array<string>(plain.length).fill(''),
    givens,
    revealed: [],
    selected: null,
    autoFill: init.autoFill,
    checkedWrong: [],
    hintsUsed: 0,
    checksUsed: 0,
    elapsedMs: 0,
    lastKeyId: null,
    solved: false,
  };
  const s = { ...base, entries: fillCipherLetters(base.entries, base, givens) };
  return { ...s, selected: findCell(s, -1, 1, isOpen(s)) };
}

/** Rebuilds a puzzle from a save. If the quote text changed since (length mismatch), starts fresh but keeps counters. */
export function restorePuzzle(init: PuzzleInit, snap: PuzzleSnapshot): PuzzleState {
  const fresh = createPuzzle(init);
  const counters = { hintsUsed: snap.hintsUsed, checksUsed: snap.checksUsed, elapsedMs: snap.elapsedMs };
  if (snap.entries.length !== fresh.plain.length) return { ...fresh, ...counters };
  const revealed = snap.revealed.filter((c) => fresh.cipher.includes(c));
  const entries = snap.entries.map((e, i) => (isLetterCell(fresh, i) && /^[A-Z]$/.test(e) ? e : ''));
  const s: PuzzleState = { ...fresh, ...counters, revealed };
  const withLocked = { ...s, entries: fillCipherLetters(entries, s, [...s.givens, ...revealed]) };
  const solved = isSolved(withLocked);
  return { ...withLocked, solved, selected: solved ? null : findCell(withLocked, -1, 1, isOpen(withLocked)) };
}

export function snapshot(s: PuzzleState): PuzzleSnapshot {
  return { entries: s.entries, revealed: s.revealed, hintsUsed: s.hintsUsed, checksUsed: s.checksUsed, elapsedMs: s.elapsedMs };
}

/** Cells that share the target cell's cipher letter (auto-fill on), or just the cell. Locked cells excluded. */
function targetsFor(s: PuzzleState, index: number): number[] {
  if (!s.autoFill) return isLocked(s, index) ? [] : [index];
  const c = cipherAt(s, index);
  const out: number[] = [];
  for (let i = 0; i < s.cipher.length; i++) if (s.cipher[i] === c && !isLocked(s, i)) out.push(i);
  return out;
}

function writeCells(s: PuzzleState, targets: number[], value: string): PuzzleState {
  if (targets.every((i) => s.entries[i] === value)) return s;
  const entries = s.entries.slice();
  for (const i of targets) entries[i] = value;
  const checkedWrong = s.checkedWrong.filter((i) => !targets.includes(i));
  const next = { ...s, entries, checkedWrong };
  return { ...next, solved: isSolved(next) };
}

export function puzzleReducer(s: PuzzleState, a: PuzzleAction): PuzzleState {
  switch (a.type) {
    case 'select': {
      if (s.solved || !isLetterCell(s, a.index) || s.selected === a.index) return s;
      return { ...s, selected: a.index };
    }
    case 'move': {
      if (s.solved) return s;
      const from = s.selected ?? (a.delta === 1 ? -1 : s.plain.length);
      const i = findCell(s, from, a.delta, () => true);
      return i === null || i === s.selected ? s : { ...s, selected: i };
    }
    case 'input': {
      if (s.solved || a.keyId === s.lastKeyId) return s;
      const keyed = { ...s, lastKeyId: a.keyId };
      const letter = a.letter.toUpperCase();
      if (!/^[A-Z]$/.test(letter) || s.selected === null || isLocked(s, s.selected)) return keyed;
      const written = writeCells(keyed, targetsFor(keyed, s.selected), letter);
      if (written.solved) return { ...written, selected: null };
      const next = findCell(written, s.selected, 1, isOpen(written));
      return { ...written, selected: next ?? s.selected };
    }
    case 'erase': {
      if (s.solved || a.keyId === s.lastKeyId) return s;
      const keyed = { ...s, lastKeyId: a.keyId };
      if (s.selected === null) return keyed;
      // On a filled cell: clear it. On an empty cell: step back to the previous editable cell and clear that.
      let at: number | null = s.selected;
      if (isLocked(s, at) || s.entries[at] === '') {
        at = findCell(s, s.selected, -1, (i) => !isLocked(s, i), false);
        if (at === null) return keyed;
      }
      return { ...writeCells(keyed, targetsFor(keyed, at), ''), selected: at };
    }
    case 'reveal': {
      if (s.solved) return s;
      const wrongOrEmpty = (i: number) => !isLocked(s, i) && s.entries[i] !== s.plain[i];
      const target =
        s.selected !== null && wrongOrEmpty(s.selected) ? s.selected : findCell(s, -1, 1, wrongOrEmpty);
      if (target === null) return s;
      const c = cipherAt(s, target);
      const revealed = [...s.revealed, c].sort();
      const withReveal = { ...s, revealed, hintsUsed: s.hintsUsed + 1 };
      const cells = s.cipher.split('').flatMap((ch, i) => (ch === c ? [i] : []));
      const entries = fillCipherLetters(s.entries, withReveal, [c]);
      const next = { ...withReveal, entries, checkedWrong: s.checkedWrong.filter((i) => !cells.includes(i)) };
      const solved = isSolved(next);
      return { ...next, solved, selected: solved ? null : findCell(next, target, 1, isOpen(next)) ?? s.selected };
    }
    case 'check': {
      if (s.solved) return s;
      const checkedWrong: number[] = [];
      s.entries.forEach((e, i) => {
        if (e !== '' && e !== s.plain[i]) checkedWrong.push(i);
      });
      return { ...s, checkedWrong, checksUsed: s.checksUsed + 1 };
    }
    case 'setAutoFill':
      return s.autoFill === a.on ? s : { ...s, autoFill: a.on };
    case 'elapsed':
      return s.solved || a.ms <= 0 ? s : { ...s, elapsedMs: s.elapsedMs + a.ms };
  }
}

// ---------- Derived state (selectors) ----------

/**
 * Cells to highlight as conflicts ("Highlight conflicts" setting):
 * - one plain letter guessed for two or more different cipher letters, and
 * - (auto-fill off) one cipher letter with different guesses in different cells.
 * Locked cells are never highlighted; the player's own cells are.
 */
export function conflicts(s: PuzzleState): Set<number> {
  const cipherByGuess = new Map<string, Set<string>>();
  const guessesByCipher = new Map<string, Set<string>>();
  for (let i = 0; i < s.entries.length; i++) {
    const e = s.entries[i] as string;
    if (e === '') continue;
    const c = cipherAt(s, i);
    if (!cipherByGuess.has(e)) cipherByGuess.set(e, new Set());
    cipherByGuess.get(e)!.add(c);
    if (!guessesByCipher.has(c)) guessesByCipher.set(c, new Set());
    guessesByCipher.get(c)!.add(e);
  }
  const out = new Set<number>();
  for (let i = 0; i < s.entries.length; i++) {
    const e = s.entries[i] as string;
    if (e === '' || isLocked(s, i)) continue;
    const c = cipherAt(s, i);
    if ((cipherByGuess.get(e)?.size ?? 0) > 1 || (guessesByCipher.get(c)?.size ?? 0) > 1) out.add(i);
  }
  return out;
}

export function isFilled(s: PuzzleState): boolean {
  return s.entries.every((e, i) => !isLetterCell(s, i) || e !== '');
}

/** When every cell is filled but the answer is wrong, the wrong cells are shown gently (no penalty). */
export function wrongWhenFilled(s: PuzzleState): number[] {
  if (s.solved || !isFilled(s)) return [];
  return s.entries.flatMap((e, i) => (isLetterCell(s, i) && e !== s.plain[i] ? [i] : []));
}

/** "Clean solve" badge: no hints and no checks. */
export const isClean = (s: PuzzleState) => s.hintsUsed === 0 && s.checksUsed === 0;

export const selectedCipher = (s: PuzzleState): string | null => (s.selected === null ? null : cipherAt(s, s.selected));

export const isLockedCell = isLocked;

/** Plain letters currently used anywhere (the keyboard dims these, it never disables them). */
export function usedLetters(s: PuzzleState): Set<string> {
  return new Set(s.entries.filter((e) => e !== ''));
}
