#!/usr/bin/env node
/**
 * `node tools/quotes/fetch.mjs [--force]`
 * Downloads the Project Gutenberg plain text of Bartlett's Familiar Quotations (ebook #27889) into
 * tools/quotes/raw/ (git-ignored) and writes a copy with the Gutenberg header and licence footer
 * stripped. Dev machine only; never runs in the app.
 *
 * Output: raw/pg27889.txt (as downloaded) and raw/bartlett.txt (body only).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAW_DIR } from './lib.mjs';

const EBOOK = 27889;
const URLS = [
  `https://www.gutenberg.org/cache/epub/${EBOOK}/pg${EBOOK}.txt`,
  `https://www.gutenberg.org/ebooks/${EBOOK}.txt.utf-8`,
  `https://www.gutenberg.org/files/${EBOOK}/${EBOOK}-0.txt`,
  `https://www.gutenberg.org/files/${EBOOK}/${EBOOK}.txt`,
  `https://gutenberg.pglaf.org/2/7/8/8/${EBOOK}/${EBOOK}.txt`,
];

/** Removes everything up to the "*** START OF ..." line and from the "*** END OF ..." line on. */
export function stripGutenberg(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i.test(l));
  const end = lines.findIndex((l) => /^\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i.test(l));
  if (start < 0 || end < 0 || end <= start) throw new Error('Gutenberg START/END markers not found');
  const body = lines.slice(start + 1, end);
  // The transcriber credit right after the START marker is Gutenberg's, not Bartlett's.
  while (body.length && (/^\s*$/.test(body[0]) || /^(Produced by|Gutenberg Online|https?:\/\/|http:\/\/)/i.test(body[0].trim()))) {
    body.shift();
  }
  return body.join('\n').trim() + '\n';
}

async function download() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'lettercrack-quote-pipeline/1.0 (offline content build)' } });
      if (!res.ok) {
        console.warn(`  ${url}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!/Familiar Quotations/i.test(text.slice(0, 5000))) {
        console.warn(`  ${url}: unexpected content`);
        continue;
      }
      console.log(`  downloaded ${url} (${text.length} chars)`);
      return text;
    } catch (e) {
      console.warn(`  ${url}: ${e.message}`);
    }
  }
  throw new Error('all download URLs failed');
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  const rawPath = join(RAW_DIR, `pg${EBOOK}.txt`);
  let text;
  if (existsSync(rawPath) && !process.argv.includes('--force')) {
    console.log(`using cached ${rawPath} (pass --force to re-download)`);
    text = readFileSync(rawPath, 'utf8');
  } else {
    text = await download();
    writeFileSync(rawPath, text);
  }
  const body = stripGutenberg(text);
  writeFileSync(join(RAW_DIR, 'bartlett.txt'), body);
  console.log(`wrote raw/bartlett.txt (${body.split('\n').length} lines, Gutenberg header/licence stripped)`);
}

if (process.argv[1]?.endsWith('fetch.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
