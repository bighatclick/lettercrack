/**
 * Shared, pure helpers for the offline quote pipeline (fetch → extract → filter → review → build).
 * No network, no file IO except the explicit loaders at the bottom. Unit-tested in __tests__/.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QUOTES_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(QUOTES_DIR, '..', '..');
export const RAW_DIR = join(QUOTES_DIR, 'raw');
export const OUT_DIR = join(QUOTES_DIR, 'out');

/**
 * The Gutenberg text of ebook #27889 is the NINTH edition (copyright 1891, 1905 printing),
 * not the 10th (1919): its title page says so. Both are public domain and pre-1929.
 */
export const SOURCE_COLLECTION = "Bartlett's Familiar Quotations";
export const SOURCE_EDITION = '9th ed., 1891 (1905 printing; Project Gutenberg #27889)';
/** The collection's own year: the latest a quote it prints can have been published. */
export const SOURCE_YEAR = 1905;

export const MIN_LEN = 40;
export const MAX_LEN = 160;
export const MIN_WORDS = 4;
export const MIN_LETTER_RATIO = 0.7;
export const MAX_DEATH_YEAR_EXCLUSIVE = 1956;
export const MAX_WORK_YEAR_EXCLUSIVE = 1929;
export const MIN_KEPT_QUOTES = 600;
export const DAILY_COUNT = 365;

/** Same normalisation validate.mjs uses for duplicate detection. */
export const normalise = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

/** Single difficulty band from text length. */
export function difficultyFor(len) {
  if (len <= 80) return 'easy';
  if (len <= 110) return 'medium';
  if (len <= 135) return 'hard';
  return 'expert';
}

/** Cleans a raw Bartlett quote: footnote markers, italics, dashes, ligatures, whitespace. */
export function cleanText(s) {
  return String(s)
    .replace(/\[\d+-\d+\]/g, '')
    .replace(/_/g, '')
    .replace(/--/g, '—')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'Ae')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    // Bartlett spaces contractions: "'T is", "tree 's", "I 'd" → "'Tis", "tree's", "I'd".
    .replace(/'([Tt]) (is|was|were|will|would)\b/g, "'$1$2")
    .replace(/(\w) '(s|d|ll|ve|re|t|m)\b/g, "$1'$2")
    .trim();
}

const WORDISH = /[A-Za-z']+/g;
const ENGLISH_FUNCTION_WORDS = new Set(
  'the a an and of to is in that it be he she not we you i my his her its our their they them this with for as on at by from but or no all are was were what who which so than then there when if have has had will shall can may must do does'.split(' '),
);

/** Loads banned.txt content into lowercase terms (one per line, '#' comments). */
export function parseBanned(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
    .filter(Boolean);
}

/** Banned terms found in `text` (whole-word match; a trailing '*' in the list means prefix match). */
export function bannedHits(text, banned) {
  const lower = String(text).toLowerCase();
  const hits = [];
  for (const term of banned) {
    const prefix = term.endsWith('*');
    const body = (prefix ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(^|[^a-z])${body}${prefix ? '' : '(?![a-z])'}`, 'i');
    if (re.test(lower)) hits.push(term);
  }
  return hits;
}

export function deathYear(info) {
  const n = Number(info?.died);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}


/**
 * Applies the spec §4.2 / CLAUDE.md rule 4–5 filters to one candidate.
 * Returns a list of rejection reasons (empty = passes). Dedupe is handled by filterCandidates.
 */
export function rejectReasons(c, { authors, banned }) {
  const reasons = [];
  const text = c.text ?? '';
  if (text.length < MIN_LEN) reasons.push('too short');
  if (text.length > MAX_LEN) reasons.push('too long');
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < MIN_WORDS) reasons.push('too few words');
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  if (text.length === 0 || letters / text.length < MIN_LETTER_RATIO) reasons.push('letter ratio < 70%');
  if (/[^\x20-\x7E—]/.test(text)) reasons.push('unsupported characters');
  const lowerWords = (text.toLowerCase().match(WORDISH) ?? []).map((w) => w.replace(/^'+|'+$/g, ''));
  if (!lowerWords.some((w) => ENGLISH_FUNCTION_WORDS.has(w))) reasons.push('not English');
  const info = authors[c.author];
  if (!info) reasons.push('author not in authors.json');
  else {
    const died = deathYear(info);
    if (!(died < MAX_DEATH_YEAR_EXCLUSIVE)) reasons.push('author death year missing or >= 1956');
  }
  if (c.workYear !== undefined && c.workYear !== null && c.workYear !== '' && !(Number(c.workYear) < MAX_WORK_YEAR_EXCLUSIVE)) {
    reasons.push('work year >= 1929');
  }
  if (bannedHits(text, banned).length) reasons.push('banned word');
  return reasons;
}

/** Filters + dedupes (first occurrence wins). Returns { kept, rejected: Map<reason, count> }. */
export function filterCandidates(candidates, ctx) {
  const seen = new Set();
  const kept = [];
  const rejected = new Map();
  const bump = (r) => rejected.set(r, (rejected.get(r) ?? 0) + 1);
  for (const c of candidates) {
    const reasons = rejectReasons(c, ctx);
    if (reasons.length) {
      bump(reasons[0]);
      continue;
    }
    const n = normalise(c.text);
    if (seen.has(n)) {
      bump('duplicate');
      continue;
    }
    seen.add(n);
    kept.push(c);
  }
  return { kept, rejected };
}

/**
 * Append-only permanent IDs. `ids` is { next, byText: { normalisedText: id }, retired?: number[] }.
 * Known texts keep their id; new texts get `next++`. An id is never reassigned or reused.
 * Returns a new ids object (input is not mutated) and the id for each text, in order.
 */
export function assignIds(ids, texts) {
  const byText = { ...(ids?.byText ?? {}) };
  const used = new Set([...Object.values(byText), ...(ids?.shipped ?? []), ...(ids?.retired ?? [])]);
  let next = Math.max(Number(ids?.next ?? 1), 1, ...[...used].map((n) => n + 1));
  const out = [];
  for (const t of texts) {
    const n = normalise(t);
    if (!n) throw new Error(`cannot assign id to empty text: ${JSON.stringify(t)}`);
    if (byText[n] === undefined) {
      byText[n] = next++;
    }
    out.push(byText[n]);
  }
  return { ids: { ...ids, next, byText, retired: [...(ids?.retired ?? [])], shipped: [...(ids?.shipped ?? [])] }, assigned: out };
}

/** mulberry32 seeded from a string (FNV-1a hash). Deterministic across platforms. */
export function seededRng(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(list, seedText) {
  const rng = seededRng(seedText);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- CSV (RFC 4180: quoted fields, doubled quotes, CRLF or LF) ----

export function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** CSV text → array of objects keyed by the header row. */
export function readCsvObjects(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

// ---- loaders ----

export const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
/** authors.json with author-extras.json (Library set + "Did you know?" fact) merged in. */
export function loadAuthors() {
  const authors = readJson(join(QUOTES_DIR, 'authors.json'), {});
  const extras = readJson(join(QUOTES_DIR, 'author-extras.json'), {});
  for (const [name, x] of Object.entries(extras)) {
    if (name.startsWith('_') || !authors[name]) continue;
    authors[name] = { ...authors[name], set: x.set, fact: x.fact };
  }
  return authors;
}

export const AUTHOR_SETS = ['poets', 'novelists', 'playwrights', 'thinkers', 'scientists', 'leaders', 'essayists'];

/** Problems with an author's Library set / fact, if any (both optional). */
export function extrasProblems(a) {
  const out = [];
  if (a?.set !== undefined && !AUTHOR_SETS.includes(a.set)) out.push(`unknown set "${a.set}"`);
  if (a?.fact !== undefined && (typeof a.fact !== 'string' || a.fact.length < 30 || a.fact.length > 160 || !/[.!]$/.test(a.fact))) {
    out.push('fact must be one sentence of 30-160 characters');
  }
  return out;
}
export const loadWorks = () => readJson(join(QUOTES_DIR, 'works.json'), {});
export const loadBanned = () => parseBanned(readFileSync(join(QUOTES_DIR, 'banned.txt'), 'utf8'));

// ---- authors / works lookups ----

/** { aliasOrName: canonicalName } from authors.json (keys starting with "_" are comments). */
export function authorIndex(authors) {
  const idx = {};
  for (const [name, info] of Object.entries(authors)) {
    if (name.startsWith('_')) continue;
    idx[name] = name;
    for (const a of info.aka ?? []) idx[a] = name;
  }
  return idx;
}

/** Display dates for the author card; validate.mjs reads the death year from the end. */
export const datesOf = (info) => info.dates ?? `${info.born}–${info.died}`;

/**
 * Year for `work` by `author` from works.json: exact key, else the longest key that the work starts
 * with followed by punctuation, else the author's "*" default. Returns { year, how } or undefined.
 */
export function lookupWorkYear(works, author, work) {
  const table = works[author];
  if (!table) return undefined;
  const w = String(work ?? '').toLowerCase().trim();
  let best;
  for (const [key, year] of Object.entries(table)) {
    if (key === '*') continue;
    const k = key.toLowerCase();
    if (w === k || (w.startsWith(k) && /^[.,;:!?]/.test(w.slice(k.length)))) {
      if (!best || k.length > best.k.length) best = { k, year };
    }
  }
  if (best) return { year: best.year, how: 'works.json' };
  if (table['*']) return { year: table['*'], how: 'author default' };
  return undefined;
}
