#!/usr/bin/env node
/**
 * `node tools/quotes/extract.mjs`
 * Parses raw/bartlett.txt (from fetch.mjs) into candidate records written to out/candidates.json:
 *   { text, author, bartlettAuthor, bartlettDates, work, workYearHint?, source, page?, line }
 *
 * Bartlett's layout (Gutenberg #27889):
 *   GEOFFREY CHAUCER. 1328-1400.          ← author heading (caps, then life dates)
 *       Indented quote lines …            ← quote block (may span stanzas)
 *   _The Assembly of Fowles. Line 379._   ← unindented attribution (italic work + locator)
 *   FOOTNOTES:                            ← skipped until the next heading
 * A few sections attribute inline: "AMELIA B. WELBY (1821-1852): _Musings. Stanza 4._"
 * Everything from "THE BIBLE." on (Bible, Book of Common Prayer, appendix, index) is skipped:
 * scripture is out of scope (CLAUDE.md rule 5) and the rest is not quotations.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { OUT_DIR, RAW_DIR, cleanText } from './lib.mjs';

// Name, then "." (one heading, "LORD BYRON 1788-1824.", omits it), footnote markers, life dates.
const HEADING = /^([A-ZÀ-Þ][A-ZÀ-Þ .,'&()\-]*[A-ZÀ-Þ)])(\.?)((?:\[[0-9a-z-]+\])*)(?:\s+(.*))?$/;
// "AMELIA B. WELBY (1821-1852): _Musings._", "CHARLES WESLEY: _Christian Fidelity._"
const INLINE_AUTHOR = /^([A-ZÀ-Þ][A-ZÀ-Þ .,'&()\-]*[A-ZÀ-Þ.])\s*(?:\(([^)]*\d[^)]*)\))?\s*(?::|,\s*--|,)\s*(.*)$/;

/** Returns { name, dates } for an author heading line, else null. */
export function matchHeading(line) {
  const h = line.match(HEADING);
  if (!h || /[a-z]/.test(h[1])) return null;
  const rest = h[4];
  if (!h[2] && !/^\d/.test(rest ?? '')) return null; // no period: only "NAME 1788-1824."
  if (!isLifeDates(rest)) return null;
  return { name: h[1].trim(), dates: (rest ?? '').replace(/_/g, '').trim() };
}
// A locator segment: "Act iii", "Sc. 2", "Line 379", "Book ii", "Page 286", "Ibid" (word + optional numbers).
const LOCATOR =
  /^(act|sc|scene|part|chap|chapter|book|bk|line|lines|l|stanza|st|canto|vol|no|page|p|letter|sect|section|epist|ep|ode|sat|satire|fable|dialogue|number|verse|v|ch|essay|maxim|frag|ibid|vide|see)\.?(\s+[ivxlcdm\d]+[a-z]?([,.\s-]+[ivxlcdm\d]+[a-z]?)*)?$/i;
const ROMAN_OR_NUM = /^[ivxlcdm\d]+[a-z]?$/i;
const SECTION_NO_AUTHOR = new Set(['MISCELLANEOUS', 'TRANSLATIONS', 'OF UNKNOWN AUTHORSHIP', 'MISCELLANEOUS TRANSLATIONS', 'FAMILIAR QUOTATIONS', 'ANONYMOUS BOOKS CITED']);

/** "HENRY W. LONGFELLOW" → "Henry W. Longfellow"; keeps "de", "of", "von" lower-case. */
export function titleCase(name) {
  const lowerWords = new Set(['de', 'of', 'von', 'the', 'la', 'du', 'van', 'and', 'or']);
  return name
    .toLowerCase()
    .split(/(\s+|-|\(|\))/)
    .map((w, i) => (i > 0 && lowerWords.has(w) ? w : w.replace(/(^|')([a-z])/g, (_, p, c) => p + c.toUpperCase())))
    .join('')
    .replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`)
    .replace(/\bO'([a-z])/g, (_, c) => `O'${c.toUpperCase()}`);
}

/** "Hamlet. Act iii. Sc. 2." → { work: "Hamlet", year? } */
export function parseWork(attribution) {
  let s = cleanText(attribution)
    .replace(/\((?:[^()]*)\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const yearMatch = s.match(/\b(1[2-9]\d\d)\b/);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const segments = s
    // Split on ". " but not after abbreviations ("Epistle to Dr. Arbuthnot", "St. Agnes", initials).
    .split(/(?<!\b(?:Dr|Mr|Mrs|St|Messrs|Gen|Col|Capt|Rev|Hon|Jr|Sr|Mt|[A-HJ-UWYZ]))\.\s+|\.$/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = [];
  for (let seg of segments) {
    seg = seg
      .replace(/,\s*(act|sc|book|part|chap|line|stanza|canto|vol|p)\b.*$/i, '')
      .replace(/,\s*[ivxlcdm\d.,\s-]+$/i, '').replace(/,\s*1[2-9]\d\d$/, '').trim();
    if (!seg) continue;
    if (/^Part [IVX]+$/.test(seg) && kept.length) {
      kept.push(seg);
      continue;
    }
    if (LOCATOR.test(seg) || ROMAN_OR_NUM.test(seg) || /^[\d\s,.-]+$/.test(seg)) {
      if (kept.length) break; // locators come after the title; stop at the first one
      continue;
    }
    kept.push(seg);
  }
  let work = kept.join('. ').replace(/[,;:]\s*$/, '').trim();
  if (!work && segments.length) {
    const first = segments[0];
    work = /^maxim\b/i.test(first) ? 'Maxims' : /^frag\b/i.test(first) ? 'Fragments' : /^ibid\b/i.test(first) ? '' : first;
  }
  return { work, year };
}

/** Heading remainder is empty or only life dates ("1328-1400.", "_Circa_ 1565.", "65-8 B. C.", "---- -1626."). */
export function isLifeDates(rest) {
  if (rest === undefined || rest.trim() === '') return true;
  const r = rest.replace(/_/g, '').replace(/circa|b\.\s*c\.|a\.\s*d\./gi, '');
  return /^[\d?()\s.\-]*$/.test(r) && /\d|----/.test(r);
}

export function extract(body) {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.trim() === 'FAMILIAR QUOTATIONS.');
  const stop = lines.findIndex((l, i) => i > start && l.trim() === 'THE BIBLE.');
  const out = [];
  let author = null; // { name, dates }
  let inFootnotes = false;
  let pending = []; // quote lines
  let pendingLine = 0;
  let lastPage;
  const pageOf = (s) => {
    const m = [...s.matchAll(/\[(\d+)-\d+\]/g)];
    return m.length ? Number(m[0][1]) : undefined;
  };

  const flush = (attribution, lineNo) => {
    if (!pending.length) return;
    const rawText = pending.join('\n');
    const inline = attribution.match(INLINE_AUTHOR);
    const who = inline ? { name: inline[1].trim(), dates: (inline[2] ?? '').trim() } : author;
    const attr = inline ? inline[3] : attribution;
    pending = [];
    if (!who) return;
    const { work, year } = parseWork(attr);
    const text = cleanText(rawText);
    if (!text) return;
    out.push({
      text,
      author: titleCase(who.name),
      bartlettAuthor: who.name,
      bartlettDates: who.dates,
      work,
      ...(year ? { workYearHint: year } : {}),
      source: cleanText(attr),
      ...(pageOf(rawText) ?? lastPage ? { page: pageOf(rawText) ?? lastPage } : {}),
      line: pendingLine + 1,
    });
  };

  for (let i = start + 1; i < stop; i++) {
    const line = lines[i];
    const p = pageOf(line);
    if (p && !inFootnotes) lastPage = p;
    if (/^FOOTNOTES:\s*$/.test(line)) {
      pending = [];
      inFootnotes = true;
      continue;
    }
    const h = matchHeading(line);
    if (h) {
      pending = [];
      inFootnotes = false;
      author = SECTION_NO_AUTHOR.has(h.name) ? null : h;
      continue;
    }
    if (inFootnotes) continue;
    if (/^\s*$/.test(line)) {
      if (pending.length && pending[pending.length - 1] !== '') pending.push('');
      continue;
    }
    if (/^\s/.test(line)) {
      if (!pending.length) pendingLine = i;
      pending.push(line.trim());
      continue;
    }
    // Unindented, non-blank: an attribution (possibly continued on following unindented lines).
    let attribution = line.trim();
    while (i + 1 < stop && /^\S/.test(lines[i + 1]) && !matchHeading(lines[i + 1]) && !/^FOOTNOTES:/.test(lines[i + 1])) {
      attribution += ' ' + lines[++i].trim();
    }
    // Trim trailing stanza separators.
    while (pending.length && pending[pending.length - 1] === '') pending.pop();
    flush(attribution, i);
  }
  return out;
}

function main() {
  const body = readFileSync(join(RAW_DIR, 'bartlett.txt'), 'utf8');
  const candidates = extract(body);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'candidates.json'), JSON.stringify(candidates, null, 1) + '\n');
  const authors = new Set(candidates.map((c) => c.author));
  console.log(`wrote out/candidates.json (${candidates.length} candidates, ${authors.size} authors)`);
}

if (process.argv[1]?.endsWith('extract.mjs')) main();
