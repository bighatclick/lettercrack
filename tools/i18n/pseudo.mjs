#!/usr/bin/env node
// Generates src/i18n/pseudo.json (en-XA) from en.json: accented letters, ~35% padding,
// and [brackets] so truncation and hard-coded strings are easy to spot. {{placeholders}} are kept.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'src', 'i18n', 'en.json');
const out = join(root, 'src', 'i18n', 'pseudo.json');

const map = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ď', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ĺ', m: 'ɱ',
  n: 'ñ', o: 'ó', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ĺ', M: 'Ṁ',
  N: 'Ñ', O: 'Ó', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ú', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

function pseudoString(s) {
  const parts = s.split(/(\{\{[^}]+\}\})/g);
  const body = parts.map((p) => (p.startsWith('{{') ? p : [...p].map((c) => map[c] ?? c).join(''))).join('');
  const pad = '~'.repeat(Math.ceil(s.length * 0.35));
  return `[${body}${pad}]`;
}

function pseudoTree(node) {
  if (typeof node === 'string') return pseudoString(node);
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, pseudoTree(v)]));
}

const en = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync(out, JSON.stringify(pseudoTree(en), null, 2) + '\n');
console.log(`wrote ${out}`);
