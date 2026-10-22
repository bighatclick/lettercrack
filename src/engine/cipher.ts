import { createRng, shuffle } from './rng';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * A substitution key: `key[i]` is the cipher letter for plain letter `ALPHABET[i]`.
 * Always a derangement (no letter maps to itself) and a bijection.
 */
export type CipherKey = string;

/** Level puzzles: same cipher for every player (specs.md §5). */
export const levelSeed = (quoteId: number) => `${quoteId}lvl`;
/** Daily puzzles: seeded by the local date. */
export const dailySeed = (date: string) => `daily:${date}`;

export const isPlainLetter = (c: string | undefined): boolean => c !== undefined && c >= 'A' && c <= 'Z' && c.length === 1;

/**
 * Uppercases ASCII a–z only, so string length and indices never change
 * (`'ß'.toUpperCase()` is two characters). Everything else is kept as-is.
 */
export function normalizeQuote(text: string): string {
  return text.replace(/[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Uniform random derangement by rejection: shuffle until there is no fixed point.
 * About e ≈ 2.7 shuffles on average; deterministic because the RNG stream is.
 */
export function makeCipherKey(seed: string): CipherKey {
  const rng = createRng(`cipher:${seed}`);
  const letters = ALPHABET.split('');
  for (;;) {
    const p = shuffle(letters, rng);
    if (p.every((c, i) => c !== ALPHABET[i])) return p.join('');
  }
}

export function encodeLetter(plain: string, key: CipherKey): string {
  return key[plain.charCodeAt(0) - 65] ?? plain;
}

/** cipher letter → plain letter. */
export function decodeMap(key: CipherKey): Record<string, string> {
  const m: Record<string, string> = {};
  for (let i = 0; i < 26; i++) m[key[i] as string] = ALPHABET[i] as string;
  return m;
}

/** Encrypts A–Z (after normalising case). Punctuation, digits and spaces are untouched. */
export function encrypt(text: string, key: CipherKey): string {
  return normalizeQuote(text).replace(/[A-Z]/g, (c) => encodeLetter(c, key));
}
