#!/usr/bin/env node
/**
 * `npm run quotes:validate` (runs in CI).
 *
 * 1. Trademarks (rule 7): no "Cryptoquip"/"Cryptoquote" in anything we ship.
 * 2. Store words (rule 8): no "free", "no ads", "#1", "best" or emoji in store/en/.
 * 3. Quote DB (rule 4): every record has full provenance, author died < 1956, work published < 1929,
 *    IDs unique, texts unique (normalised).
 * 4. Content (rule 5): no tools/quotes/banned.txt word in any live quote text (retired quotes are
 *    exempt: they stay in the file only so their id never disappears).
 * 5. Permanent IDs: for quotes.vN.json, every id in tools/quotes/ids.json "shipped" is still
 *    present, each quote's id matches ids.json for its text, and (when git history is available)
 *    no id of the committed version has been removed.
 * 6. quotes.vN.json (not the dev seed) has a dailyOrder of at least 365 distinct ids.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DAILY_COUNT, bannedHits, extrasProblems, loadBanned } from './lib.mjs';

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
  ? readdirSync(join(root, 'assets')).filter((f) => /^quotes\.(v\d+|seed)\.json$/.test(f))
  : [];

const banned = loadBanned();
const idsPath = join(root, 'tools', 'quotes', 'ids.json');
const idRegistry = existsSync(idsPath) ? JSON.parse(readFileSync(idsPath, 'utf8')) : undefined;

/** The committed (HEAD) version of a JSON file, or undefined (no git, new file, shallow checkout). */
function committedJson(relPath) {
  try {
    const out = execFileSync('git', ['show', `HEAD:${relPath}`], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(out.toString('utf8'));
  } catch {
    return undefined;
  }
}

for (const f of dbFiles) {
  const db = JSON.parse(readFileSync(join(root, 'assets', f), 'utf8'));
  const isRelease = /^quotes\.v\d+\.json$/.test(f);
  if (isRelease && !idRegistry) fail(`${f}: tools/quotes/ids.json (the permanent id registry) is missing`);
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
    if (!q.retired) {
      const hits = bannedHits(q.text ?? '', banned);
      if (hits.length) fail(`${where}: banned word(s) ${hits.join(', ')} (tools/quotes/banned.txt)`);
    }
    if (isRelease && idRegistry && idRegistry.byText?.[n] !== q.id) {
      fail(`${where}: ids.json maps this text to ${idRegistry.byText?.[n] ?? 'nothing'}; ids are permanent`);
    }
    if (texts.has(n)) fail(`${where}: duplicate text of id=${texts.get(n)}`);
    texts.set(n, q.id);
    // The author card needs dates and a one-line bio written by us.
    if (!Array.isArray(db) && db.authors) {
      const a = db.authors[q.author];
      if (!a?.bio || !a?.dates) fail(`${where}: author "${q.author}" has no dates/bio entry`);
      for (const p of extrasProblems(a)) fail(`${where}: author "${q.author}": ${p}`);
    }
  }
  if (!Array.isArray(db) && Array.isArray(db.dailyOrder)) {
    for (const id of db.dailyOrder) if (!ids.has(id)) fail(`${f}: dailyOrder references unknown id ${id}`);
  }
  if (isRelease) {
    const daily = Array.isArray(db) ? [] : (db.dailyOrder ?? []);
    if (daily.length < DAILY_COUNT) fail(`${f}: dailyOrder has ${daily.length} ids; a release DB needs at least ${DAILY_COUNT}`);
    if (new Set(daily).size !== daily.length) fail(`${f}: dailyOrder has duplicate ids`);
    for (const id of idRegistry?.shipped ?? []) if (!ids.has(id)) fail(`${f}: shipped id ${id} was removed (retire it instead)`);
    if (idRegistry && ids.size && Math.max(...ids) >= Number(idRegistry.next ?? 0)) {
      fail(`${f}: ids.json "next" (${idRegistry.next}) must be greater than every id`);
    }
    const committed = committedJson(`assets/${f}`);
    const committedQuotes = Array.isArray(committed) ? committed : committed?.quotes;
    for (const q of committedQuotes ?? []) if (!ids.has(q.id)) fail(`${f}: id ${q.id} is in the committed version but was removed`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\nquotes:validate failed with ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`quotes:validate ok (${dbFiles.length} quote DB file(s), ${shipped.length} shipped files scanned)`);
