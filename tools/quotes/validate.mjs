#!/usr/bin/env node
/**
 * `npm run quotes:validate` (runs in CI). Phase 0 version; Phase 2 adds the banned-word list
 * and the "IDs never removed vs the previous quotes.vN.json" check.
 *
 * 1. Trademarks (rule 7): no "Cryptoquip"/"Cryptoquote" in anything we ship.
 * 2. Store words (rule 8): no "free", "no ads", "#1", "best" or emoji in store/en/.
 * 3. Quote DB (rule 4): every record has full provenance, author died < 1956, work published < 1929,
 *    IDs unique, texts unique (normalised).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const errors = [];
const fail = (msg) => errors.push(msg);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const textExt = /\.(ts|tsx|js|mjs|json|md|txt|csv)$/i;

// 1. Trademarks in everything that ships, plus app.json.
const TRADEMARK = /cryptoquip|cryptoquote/i;
const shipped = [...['app', 'src', 'assets', 'store', 'modules'].flatMap((d) => walk(join(root, d))), join(root, 'app.json')];
const isTest = (f) => /[\\/]__tests__[\\/]|\.test\.tsx?$/.test(f);
for (const file of shipped.filter((f) => textExt.test(f) && existsSync(f) && !isTest(f))) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (TRADEMARK.test(line)) {
        fail(`${relative(root, file)}:${i + 1}: trademarked term (CLAUDE.md rule 7)`);
      }
    });
}

// 2. Store words.
const STORE_BANNED = [/\bfree\b/i, /\bno ads\b/i, /#1\b/, /\bbest\b/i, /\p{Extended_Pictographic}/u];
for (const file of walk(join(root, 'store', 'en')).filter((f) => textExt.test(f))) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const re of STORE_BANNED) if (re.test(line)) fail(`${relative(root, file)}:${i + 1}: banned store word ${re}`);
    });
}

// 3. Quote DB(s).
const REQUIRED = ['id', 'text', 'author', 'authorDates', 'work', 'workYear', 'sourceCollection', 'sourceEdition', 'difficulty'];
const normalise = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const dbFiles = existsSync(join(root, 'assets'))
  ? readdirSync(join(root, 'assets')).filter((f) => /^quotes\.v\d+\.json$/.test(f))
  : [];

for (const f of dbFiles) {
  const db = JSON.parse(readFileSync(join(root, 'assets', f), 'utf8'));
  const quotes = Array.isArray(db) ? db : db.quotes;
  if (!Array.isArray(quotes)) {
    fail(`${f}: expected an array of quotes`);
    continue;
  }
  const ids = new Set();
  const texts = new Map();
  for (const q of quotes) {
    const where = `${f} id=${q.id}`;
    for (const k of REQUIRED) if (q[k] === undefined || q[k] === null || q[k] === '') fail(`${where}: missing ${k}`);
    if (ids.has(q.id)) fail(`${where}: duplicate id`);
    ids.add(q.id);
    const died = Number(String(q.authorDates ?? '').match(/(\d{3,4})\s*$/)?.[1]);
    if (!(died < 1956)) fail(`${where}: author death year must be < 1956 (got "${q.authorDates}")`);
    if (!(Number(q.workYear) < 1929)) fail(`${where}: work must be published before 1929 (got ${q.workYear})`);
    const n = normalise(q.text ?? '');
    if (texts.has(n)) fail(`${where}: duplicate text of id=${texts.get(n)}`);
    texts.set(n, q.id);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\nquotes:validate failed with ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`quotes:validate ok (${dbFiles.length} quote DB file(s), ${shipped.length} shipped files scanned)`);
