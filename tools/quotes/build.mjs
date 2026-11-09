#!/usr/bin/env node
/**
 * `node tools/quotes/build.mjs [--allow-small] [--dry-run]`
 * tools/quotes/review.csv (editor decisions) → assets/quotes.v1.json (QuoteDb shape, src/content/quotes.ts).
 *
 * - Takes rows with decision "keep", or "fix" (the text column holds the corrected text).
 *   Rows without a numeric workYear < 1929, without a work, or whose author is not in authors.json
 *   are skipped with a warning (CLAUDE.md rule 4).
 * - IDs are permanent and append-only via tools/quotes/ids.json (normalised text → id, starting at 1).
 *   A text that was ever assigned an id keeps it; an id is never reused.
 * - Any quote in the previous assets/quotes.v1.json that is no longer kept stays in the output with
 *   `retired: true`, so no shipped id ever disappears (seen-tracking and streaks reference them).
 * - dailyOrder keeps the previous DB's order and appends new, non-retired ids (seeded shuffle,
 *   mulberry32) until it holds 365.
 * - Refuses to write with fewer than 600 kept quotes unless --allow-small.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DAILY_COUNT,
  MAX_WORK_YEAR_EXCLUSIVE,
  MIN_KEPT_QUOTES,
  QUOTES_DIR,
  ROOT,
  SOURCE_COLLECTION,
  SOURCE_EDITION,
  assignIds,
  authorIndex,
  bannedHits,
  datesOf,
  difficultyFor,
  loadAuthors,
  loadBanned,
  normalise,
  readCsvObjects,
  readJson,
  rejectReasons,
  seededShuffle,
} from './lib.mjs';

export const DB_VERSION = 'v1';
export const DAILY_SEED = 'lettercrack:dailyOrder:v1';

/**
 * Slot 0 of dailyOrder. Must match DAILY_EPOCH in src/engine/daily.ts (or be a whole number of
 * weeks from it), so Sunday-special slots fall on Sundays.
 */
export const DAILY_EPOCH = '2026-10-30';
/** A Sunday special is at least this long (Expert length band starts at 100). */
export const SUNDAY_MIN_CHARS = 110;
/** Does dailyOrder slot `i` fall on a Sunday? */
export const isSundaySlot = (i) => new Date(Date.parse(`${DAILY_EPOCH}T00:00:00Z`) + i * 86_400_000).getUTCDay() === 0;

/** Turns reviewed CSV rows into accepted quote inputs + warnings. Pure. */
export function acceptRows(rows, { authors, banned }) {
  const idx = authorIndex(authors);
  const accepted = [];
  const warnings = [];
  rows.forEach((r, i) => {
    const decision = String(r.decision ?? '').trim().toLowerCase();
    if (decision !== 'keep' && decision !== 'fix') return;
    const where = `review.csv row ${i + 2}`;
    const text = String(r.text ?? '').trim();
    const author = idx[String(r.author ?? '').trim()];
    const workYear = Number(String(r.workYear ?? '').trim());
    const work = String(r.work ?? '').trim();
    if (!author) return warnings.push(`${where}: author "${r.author}" not in authors.json; skipped`);
    if (!String(r.workYear ?? '').trim() || !Number.isInteger(workYear) || !(workYear < MAX_WORK_YEAR_EXCLUSIVE)) {
      return warnings.push(`${where}: workYear "${r.workYear}" missing or not < ${MAX_WORK_YEAR_EXCLUSIVE}; skipped`);
    }
    if (!work) return warnings.push(`${where}: no work title; skipped`);
    const reasons = rejectReasons({ text, author, workYear }, { authors, banned });
    if (reasons.length) return warnings.push(`${where}: ${reasons.join(', ')}; skipped`);
    accepted.push({
      text,
      author,
      work,
      workYear,
      topics: String(r.topics ?? '')
        .split(/[;|]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
  });
  // Duplicates after "fix" edits: first row wins.
  const seen = new Set();
  const unique = accepted.filter((q) => {
    const n = normalise(q.text);
    if (seen.has(n)) {
      warnings.push(`duplicate kept text skipped: "${q.text.slice(0, 50)}…"`);
      return false;
    }
    seen.add(n);
    return true;
  });
  return { accepted: unique, warnings };
}

/**
 * Assembles the QuoteDb. Pure: `ids` and `previous` come in, the new ids file and db go out.
 * Throws if any id from `previous` would disappear (it never should).
 */
export function assembleDb(accepted, { authors, ids, previous }) {
  const { ids: nextIds, assigned } = assignIds(ids, accepted.map((q) => q.text));
  const quotes = accepted.map((q, i) => ({
    id: assigned[i],
    text: q.text,
    author: q.author,
    authorDates: datesOf(authors[q.author]),
    work: q.work,
    workYear: q.workYear,
    sourceCollection: SOURCE_COLLECTION,
    sourceEdition: SOURCE_EDITION,
    topics: q.topics,
    difficulty: difficultyFor(q.text.length),
  }));
  const liveIds = new Set(quotes.map((q) => q.id));
  if (liveIds.size !== quotes.length) throw new Error('two kept quotes received the same id');

  // Retire, never remove, anything shipped before.
  const prevQuotes = previous?.quotes ?? [];
  const retiredIds = new Set(nextIds.retired);
  for (const pq of prevQuotes) {
    if (liveIds.has(pq.id)) continue;
    quotes.push({ ...pq, retired: true });
    retiredIds.add(pq.id);
  }
  for (const q of quotes) if (!q.retired) retiredIds.delete(q.id); // un-retired when kept again
  nextIds.retired = [...retiredIds].sort((a, b) => a - b);
  quotes.sort((a, b) => a.id - b.id);
  // Every id that has ever shipped; validate.mjs fails if one goes missing from the DB.
  nextIds.shipped = [...new Set([...(ids?.shipped ?? []), ...quotes.map((q) => q.id)])].sort((a, b) => a - b);

  const allIds = new Set(quotes.map((q) => q.id));
  for (const pq of prevQuotes) if (!allIds.has(pq.id)) throw new Error(`id ${pq.id} from the previous DB would be removed`);

  // dailyOrder: previous order is fixed (dates already played map to it); append new live ids.
  const dailyOrder = [...(previous?.dailyOrder ?? [])].filter((id) => allIds.has(id));
  const inDaily = new Set(dailyOrder);
  const fresh = seededShuffle(
    quotes.filter((q) => !q.retired && !inDaily.has(q.id)).map((q) => q.id),
    DAILY_SEED,
  );
  // Sunday specials: slots that fall on a Sunday take a long quote when one is left.
  const byId = new Map(quotes.map((q) => [q.id, q]));
  const isLong = (id) => (byId.get(id)?.text.length ?? 0) >= SUNDAY_MIN_CHARS;
  const long = fresh.filter(isLong);
  const rest = fresh.filter((id) => !isLong(id));
  while (dailyOrder.length < DAILY_COUNT && (long.length || rest.length)) {
    const sunday = isSundaySlot(dailyOrder.length);
    const pool = sunday ? (long.length ? long : rest) : rest.length ? rest : long;
    dailyOrder.push(pool.shift());
  }

  const used = [...new Set(quotes.map((q) => q.author))].sort();
  const authorMap = {};
  for (const name of used) {
    const a = authors[name];
    authorMap[name] = a ? { dates: datesOf(a), bio: a.bio, ...(a.set ? { set: a.set } : {}), ...(a.fact ? { fact: a.fact } : {}) } : previous?.authors?.[name];
  }
  return {
    db: { version: DB_VERSION, authors: authorMap, dailyOrder, quotes },
    ids: nextIds,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const reviewPath = join(QUOTES_DIR, 'review.csv');
  if (!existsSync(reviewPath)) throw new Error('tools/quotes/review.csv missing: run filter.mjs, then review it');
  const authors = loadAuthors();
  const banned = loadBanned();
  const rows = readCsvObjects(readFileSync(reviewPath, 'utf8'));
  const { accepted, warnings } = acceptRows(rows, { authors, banned });
  for (const w of warnings) console.warn(`  ${w}`);

  if (accepted.length < MIN_KEPT_QUOTES && !args.has('--allow-small')) {
    console.error(`only ${accepted.length} kept quotes (need ≥ ${MIN_KEPT_QUOTES}); not writing. Pass --allow-small for a dev build.`);
    process.exit(1);
  }

  const idsPath = join(QUOTES_DIR, 'ids.json');
  const dbPath = join(ROOT, 'assets', `quotes.${DB_VERSION}.json`);
  const previous = readJson(dbPath, undefined);
  const { db, ids } = assembleDb(accepted, { authors, ids: readJson(idsPath, { next: 1, byText: {}, retired: [], shipped: [] }), previous });

  for (const q of db.quotes) {
    if (bannedHits(q.text, banned).length && !q.retired) throw new Error(`banned word in id ${q.id}`);
  }
  const live = db.quotes.filter((q) => !q.retired).length;
  console.log(`${live} live quotes, ${db.quotes.length - live} retired, ${Object.keys(db.authors).length} authors, dailyOrder ${db.dailyOrder.length}`);
  if (args.has('--dry-run')) {
    console.log('dry run: nothing written');
    return;
  }
  writeFileSync(idsPath, JSON.stringify(ids, null, 1) + '\n');
  writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');
  console.log(`wrote ${dbPath} and tools/quotes/ids.json`);
}

if (process.argv[1]?.endsWith('build.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
