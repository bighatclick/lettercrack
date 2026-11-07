#!/usr/bin/env node
/**
 * `node tools/quotes/filter.mjs [--force]`
 * out/candidates.json → tools/quotes/review.csv for the human editor (CLAUDE.md rules 4–5).
 *
 * Filters (lib.mjs rejectReasons): 40–160 chars, ≥ 4 words, letters ≥ 70%, A–Z text only,
 * author in authors.json with death year < 1956, work year (when known) < 1929, banned.txt,
 * then dedupe by normalised text. Rows are pre-sorted best-first (clean, mid-length, well-known
 * authors, year known). The decision column is left blank: the editor writes keep / drop / fix.
 *
 * Re-running never destroys review work: if review.csv already has any decision filled in, the
 * new list goes to review.new.csv unless --force is passed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_WORK_YEAR_EXCLUSIVE,
  OUT_DIR,
  QUOTES_DIR,
  authorIndex,
  datesOf,
  filterCandidates,
  loadAuthors,
  loadBanned,
  loadWorks,
  lookupWorkYear,
  normalise,
  readCsvObjects,
  readJson,
  toCsv,
} from './lib.mjs';

export const REVIEW_HEADER = ['id_hint', 'decision', 'text', 'author', 'authorDates', 'work', 'workYear', 'topics', 'notes'];

/** Authors read in translation in Bartlett (their quotes need a "translation" note for the editor). */
const NON_ENGLISH = new Set([
  'Plutarch', 'Marcus Aurelius', 'Epictetus', 'Tacitus', 'Quintilian', 'Juvenal', 'Martial', 'Pliny the Younger',
  'Miguel de Cervantes', 'Michel de Montaigne', 'François Rabelais', 'François de La Rochefoucauld', 'Blaise Pascal',
  'Molière', 'Voltaire', 'Jean de La Fontaine', 'Nicolas Boileau', 'Alain-René Lesage', 'Johann Wolfgang von Goethe',
  'Jean-Jacques Rousseau',
]);

/** Authors a general audience will recognise: a sort boost, not a filter. */
const WELL_KNOWN = new Set([
  'William Shakespeare', 'Alexander Pope', 'John Milton', 'Lord Byron', 'William Wordsworth', 'Samuel Johnson', 'Alfred, Lord Tennyson',
  'Oliver Goldsmith', 'Miguel de Cervantes', 'Marcus Aurelius', 'Ralph Waldo Emerson', 'Robert Burns', 'Samuel Taylor Coleridge',
  'Sir Walter Scott', 'Henry Wadsworth Longfellow', 'Geoffrey Chaucer', 'Francis Bacon', 'Jonathan Swift', 'Benjamin Franklin',
  'John Keats', 'Percy Bysshe Shelley', 'Charles Dickens', 'Edgar Allan Poe', 'Thomas Jefferson', 'Abraham Lincoln', 'George Washington',
  'Robert Browning', 'Elizabeth Barrett Browning', 'Thomas Gray', 'Edmund Burke', 'Michel de Montaigne', 'Voltaire', 'Blaise Pascal',
  'Johann Wolfgang von Goethe', 'Charles Darwin', 'Benjamin Disraeli', 'Thomas Carlyle', 'Izaak Walton', 'John Bunyan', 'Daniel Webster',
  'Washington Irving', 'Oliver Wendell Holmes Sr.', 'James Russell Lowell', 'Richard Brinsley Sheridan', 'Charles Lamb', 'Matthew Arnold',
  'Laurence Sterne', 'Edward Gibbon', 'Sir Walter Raleigh', 'Christopher Marlowe', 'Ben Jonson', 'John Donne', 'Plutarch', 'Epictetus',
  'François de La Rochefoucauld', 'Jean de La Fontaine', 'Molière', 'Edmund Spenser', 'Sir Philip Sidney', 'John Dryden', 'William Cowper',
  'Thomas Babington Macaulay', 'Mary Howitt', 'Jane Taylor', 'Leigh Hunt', 'William Cullen Bryant', 'John Greenleaf Whittier',
]);

const ARCHAIC = /\b(thou|thee|thy|thine|hath|doth|dost|art thou|ye|'tis|'twas|o'er|e'er|ne'er|wherefore|whence|thence|hither|thither|methinks|prithee|quoth|nay|yea|shalt|wilt|canst|hast|didst|wouldst|couldst|shouldst|mayst|eth|est)\b/i;
const OLD_SPELLING = /\b\w+(eth|yng|ynge|ysse|esse)\b|\b(onely|doe|goe|bee|wee|shee|hee|soone|beene|neere|owne|selfe|woorse|warke|daies|kinde)\b/i;

const TOPICS = {
  wisdom: /\b(wis(e|dom|est|er)|fool(s|ish)?|folly|knowledge|learn(ing|ed)?|reason)\b/i,
  time: /\b(time|hours?|days?|years?|tomorrow|to-morrow|yesterday|age|youth|old)\b/i,
  love: /\b(love[sd]?|loving|heart|affection)\b/i,
  friendship: /\b(friends?|friendship|companions?)\b/i,
  nature: /\b(nature|flowers?|rose|trees?|woods?|sea|sun|moon|stars?|birds?|spring|summer|winter|autumn|rain|fields?)\b/i,
  hope: /\b(hope[sd]?|hopeful|despair)\b/i,
  happiness: /\b(happ(y|iness)|joy(s|ful)?|merry|mirth|laugh(ter)?|content(ment)?|cheer(ful)?)\b/i,
  courage: /\b(courage|brave(ry)?|bold|fear|valou?r)\b/i,
  truth: /\b(truth|true|honest(y)?|lie[sd]?|liars?)\b/i,
  work: /\b(work|labou?r|toil|industry|idle(ness)?|busy|diligence)\b/i,
  words: /\b(words?|speech|speak|talk|tongue|silence|books?|read(ing)?|writ(e|ing|ers?))\b/i,
  virtue: /\b(virtue|good(ness)?|kind(ness)?|patience|humble|humility|pride|honou?r|duty)\b/i,
  money: /\b(money|gold|rich(es)?|wealth|poor|poverty|thrift|penny|pence|pounds?|purse)\b/i,
  humor: /\b(wit|jest|jokes?)\b/i,
};

export function topicsFor(text) {
  return Object.entries(TOPICS)
    .filter(([, re]) => re.test(text))
    .map(([t]) => t)
    .slice(0, 3);
}

/** Higher = better first-pass suitability for a cryptogram. Pure heuristic; the editor decides. */
export function suitability(row, authorCounts) {
  const t = row.text;
  let s = 0;
  s += Math.min(Math.log2(1 + (authorCounts.get(row.author) ?? 0)), 8); // prolific in Bartlett ≈ well known
  if (WELL_KNOWN.has(row.author)) s += 6;
  s -= Math.abs(t.length - 85) / 12; // mid-length reads best on a phone
  if (/^[A-Z"']/.test(t)) s += 2;
  else s -= 4; // starts mid-sentence
  if (/[.!?]["']?$/.test(t)) s += 2;
  else s -= 3; // trails off
  if (/\.\s*\.\s*\./.test(t) || /—$/.test(t)) s -= 3;
  if (ARCHAIC.test(t)) s -= 2;
  if (OLD_SPELLING.test(t)) s -= 5;
  if (/[()[\]]/.test(t)) s -= 2;
  if ((t.match(/"/g) ?? []).length % 2) s -= 2;
  if (!row.workYear) s -= 6;
  if (NON_ENGLISH.has(row.author)) s -= 1;
  return s;
}

/** Builds the review rows from raw candidates. Pure; used by main() and the tests. */
export function buildReviewRows(candidates, { authors, works, banned, ids }) {
  const idx = authorIndex(authors);
  const enriched = candidates.map((c) => {
    const author = idx[c.author] ?? c.author;
    const info = authors[author];
    const notes = [];
    let workYear = '';
    const found = info ? lookupWorkYear(works, author, c.work) : undefined;
    if (found) {
      workYear = found.year;
      if (found.how === 'author default') notes.push('year is the author default in works.json; check');
    } else if (c.workYearHint && info && c.workYearHint >= (info.born ?? 0) + 10 && c.workYearHint < MAX_WORK_YEAR_EXCLUSIVE) {
      workYear = c.workYearHint;
      notes.push('year from Bartlett attribution; check');
    } else {
      notes.push('needs year');
    }
    return { ...c, author, workYear, notes };
  });

  const { kept, rejected } = filterCandidates(enriched, { authors, banned });
  const authorCounts = new Map();
  for (const k of kept) authorCounts.set(k.author, (authorCounts.get(k.author) ?? 0) + 1);

  const rows = kept.map((k) => {
    const info = authors[k.author];
    const notes = [...k.notes];
    if (NON_ENGLISH.has(k.author) || /of Homer|of Horace|Virgil|Ovid|Juvenal|Anacreon|Persius/i.test(k.work)) notes.push('translation');
    if (OLD_SPELLING.test(k.text)) notes.push('old spelling');
    if (!/^[A-Z"']/.test(k.text) || !/[.!?]["']?$/.test(k.text)) notes.push('fragment? check against source');
    if (!k.work) notes.push('needs work title');
    notes.push(`src: ${k.source}${k.page ? ` (Bartlett p. ${k.page})` : ''}`);
    const existing = ids?.byText?.[normalise(k.text)];
    return {
      id_hint: existing ?? 'new',
      decision: '',
      text: k.text,
      author: k.author,
      authorDates: datesOf(info),
      work: k.work,
      workYear: k.workYear,
      topics: topicsFor(k.text).join(';'),
      notes: notes.join('; '),
      _score: suitability(k, authorCounts),
    };
  });
  rows.sort((a, b) => b._score - a._score || a.text.localeCompare(b.text));
  return { rows: diversify(rows), rejected };
}

/**
 * Re-ranks so one prolific author (Shakespeare has ~800 survivors) does not fill the top of the
 * sheet: each pick costs that author `perPick / sqrt(their survivor count)` points on later rows. Deterministic.
 */
export function diversify(sorted, perPick = 2) {
  const queues = new Map();
  for (const r of sorted) {
    if (!queues.has(r.author)) queues.set(r.author, []);
    queues.get(r.author).push(r);
  }
  const picked = new Map();
  const heads = new Map([...queues.keys()].map((a) => [a, 0]));
  const out = [];
  while (out.length < sorted.length) {
    let best;
    let bestScore = -Infinity;
    for (const [author, q] of queues) {
      const i = heads.get(author);
      if (i >= q.length) continue;
      const s = q[i]._score - (perPick * (picked.get(author) ?? 0)) / Math.sqrt(q.length);
      if (s > bestScore) {
        bestScore = s;
        best = author;
      }
    }
    out.push(queues.get(best)[heads.get(best)]);
    heads.set(best, heads.get(best) + 1);
    picked.set(best, (picked.get(best) ?? 0) + 1);
  }
  return out;
}

export const reviewCsv = (rows) => toCsv(REVIEW_HEADER, rows.map((r) => REVIEW_HEADER.map((h) => r[h])));

function main() {
  const candidates = readJson(join(OUT_DIR, 'candidates.json'));
  if (!candidates) throw new Error('out/candidates.json missing: run extract.mjs first');
  const authors = loadAuthors();
  const { rows, rejected } = buildReviewRows(candidates, {
    authors,
    works: loadWorks(),
    banned: loadBanned(),
    ids: readJson(join(QUOTES_DIR, 'ids.json'), { next: 1, byText: {} }),
  });

  const reviewPath = join(QUOTES_DIR, 'review.csv');
  let outPath = reviewPath;
  if (existsSync(reviewPath) && !process.argv.includes('--force')) {
    const decided = readCsvObjects(readFileSync(reviewPath, 'utf8')).filter((r) => (r.decision ?? '').trim());
    if (decided.length) {
      outPath = join(QUOTES_DIR, 'review.new.csv');
      console.warn(`review.csv has ${decided.length} decision(s); writing ${outPath} instead (pass --force to overwrite).`);
    }
  }
  writeFileSync(outPath, reviewCsv(rows));

  const withYear = rows.filter((r) => r.workYear !== '').length;
  console.log(`candidates: ${candidates.length}`);
  for (const [reason, n] of [...rejected.entries()].sort((a, b) => b[1] - a[1])) console.log(`  dropped ${String(n).padStart(5)}  ${reason}`);
  console.log(`survivors: ${rows.length} (${withYear} with a work year, ${rows.length - withYear} need one) from ${new Set(rows.map((r) => r.author)).size} authors`);
  console.log(`wrote ${outPath}`);
}

if (process.argv[1]?.endsWith('filter.mjs')) main();
