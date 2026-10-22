import { ALPHABET, dailySeed, decodeMap, encrypt, levelSeed, makeCipherKey, normalizeQuote } from '../cipher';
import { createRng, hashString } from '../rng';

const SEEDS = 10_000;

describe('rng (frozen)', () => {
  it('pins golden outputs so every player keeps the same ciphers', () => {
    // If any of these change, every cipher already played in the wild changes. Never edit them.
    const r = createRng('golden');
    expect([r(), r(), r()].map((x) => Math.floor(x * 1e6))).toEqual([921245, 486740, 835386]);
    expect(makeCipherKey(levelSeed(1))).toBe('SXHUQWOTARZYVDJBNMGCIKLEFP');
    expect(makeCipherKey(dailySeed('2027-01-01'))).toBe('CORUHNLAGWMJXKFETQIDVZPSBY');
    expect(hashString('lettercrack')).toBe(2754657116);
  });
});

describe('cipher (F1)', () => {
  it(`is a derangement and a bijection for ${SEEDS.toLocaleString('en-US')} seeds`, () => {
    for (let s = 0; s < SEEDS; s++) {
      const key = makeCipherKey(levelSeed(s));
      expect(key).toHaveLength(26);
      expect(new Set(key).size).toBe(26);
      for (let i = 0; i < 26; i++) {
        if (key[i] === ALPHABET[i]) throw new Error(`fixed point ${key[i]} for seed ${s}`);
      }
    }
  });

  it('gives the same cipher for the same seed, and different ciphers for different seeds', () => {
    expect(makeCipherKey('a')).toBe(makeCipherKey('a'));
    const keys = new Set(Array.from({ length: 1000 }, (_, i) => makeCipherKey(dailySeed(`2027-01-${i}`))));
    expect(keys.size).toBe(1000);
  });

  it('is roughly uniform: each plain letter maps to each other letter about equally often', () => {
    const counts = Array.from({ length: 26 }, () => new Array<number>(26).fill(0));
    for (let s = 0; s < SEEDS; s++) {
      const key = makeCipherKey(String(s));
      for (let i = 0; i < 26; i++) (counts[i] as number[])[key.charCodeAt(i) - 65]! += 1;
    }
    const expected = SEEDS / 25;
    for (const row of counts) {
      row.forEach((c, j) => {
        if (c === 0) return; // the diagonal
        expect(Math.abs(c - expected) / expected).toBeLessThan(0.3);
      });
    }
  });

  it('leaves non-letters untouched and keeps length', () => {
    const key = makeCipherKey('x');
    for (let s = 0; s < 500; s++) {
      const text = `It's 1776—"Well-done," said 'Ben'; 3.14 & ¿ü? ${s}`;
      const out = encrypt(text, key);
      expect(out).toHaveLength(text.length);
      for (let i = 0; i < text.length; i++) {
        const c = text[i] as string;
        if (/[A-Za-z]/.test(c)) expect(out[i]).toMatch(/[A-Z]/);
        else expect(out[i]).toBe(c);
      }
    }
  });

  it('round-trips through the decode map', () => {
    const key = makeCipherKey('rt');
    const dec = decodeMap(key);
    const plain = normalizeQuote('Well done is better than well said.');
    const back = encrypt(plain, key).replace(/[A-Z]/g, (c) => dec[c] as string);
    expect(back).toBe(plain);
  });

  it('normalises only ASCII letters, so indices never shift', () => {
    expect(normalizeQuote('straße café')).toBe('STRAßE CAFé');
  });
});
