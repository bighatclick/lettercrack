// node --test tools/quotes/__tests__/
// Offline unit tests for the quote pipeline: tiny inline fixtures, no network, no file writes.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { acceptRows, assembleDb, isSundaySlot, SUNDAY_MIN_CHARS } from '../build.mjs';
import { extract, matchHeading, parseWork } from '../extract.mjs';
import { stripGutenberg } from '../fetch.mjs';
import { buildReviewRows, reviewCsv } from '../filter.mjs';
import {
  assignIds,
  bannedHits,
  cleanText,
  difficultyFor,
  filterCandidates,
  lookupWorkYear,
  parseBanned,
  readCsvObjects,
  rejectReasons,
  seededShuffle,
} from '../lib.mjs';

const authors = {
  'Jane Writer': { born: 1800, died: 1870, bio: 'Test author.' },
  'Late Writer': { born: 1900, died: 1960, bio: 'Died too late.' },
  'Alias Author': { born: 1700, died: 1750, bio: 'Has an alias.', aka: ['A. Author'] },
};
const banned = parseBanned('# comment\nkill\nwar\ndamn*\nlord\n');
const ctx = { authors, banned };
const good = 'Patience and time do more than strength or passion ever could.'; // 63 chars, 11 words

describe('filter rules', () => {
  it('accepts a clean 40–160 char English quote by a pre-1956 author', () => {
    assert.deepEqual(rejectReasons({ text: good, author: 'Jane Writer', workYear: 1850 }, ctx), []);
  });

  it('enforces the length bounds (40..160 inclusive)', () => {
    const at = (n) => ('the cat sat on a mat and ' .repeat(10)).slice(0, n - 1).trim().padEnd(n - 1, 'a') + '.';
    assert.ok(rejectReasons({ text: at(39), author: 'Jane Writer' }, ctx).includes('too short'));
    assert.ok(!rejectReasons({ text: at(40), author: 'Jane Writer' }, ctx).includes('too short'));
    assert.ok(!rejectReasons({ text: at(160), author: 'Jane Writer' }, ctx).includes('too long'));
    assert.ok(rejectReasons({ text: at(161), author: 'Jane Writer' }, ctx).includes('too long'));
  });

  it('needs at least 4 words', () => {
    const r = rejectReasons({ text: 'Incomprehensibilities, notwithstanding, extraordinarily.', author: 'Jane Writer' }, ctx);
    assert.ok(r.includes('too few words'));
  });

  it('needs letters to be at least 70% of the characters', () => {
    const r = rejectReasons({ text: 'A b, c; d: e! f? g... h -- i (j) [k] 1 2 3 4 5 6 7 8 9 0 , , , , !', author: 'Jane Writer' }, ctx);
    assert.ok(r.includes('letter ratio < 70%'));
  });

  it('rejects authors who died in 1956 or later, or who are unknown', () => {
    assert.ok(rejectReasons({ text: good, author: 'Late Writer' }, ctx).includes('author death year missing or >= 1956'));
    assert.ok(rejectReasons({ text: good, author: 'Nobody' }, ctx).includes('author not in authors.json'));
  });

  it('rejects works published in 1929 or later', () => {
    assert.ok(rejectReasons({ text: good, author: 'Jane Writer', workYear: 1929 }, ctx).includes('work year >= 1929'));
    assert.ok(!rejectReasons({ text: good, author: 'Jane Writer', workYear: 1928 }, ctx).includes('work year >= 1929'));
  });

  it('rejects banned words as whole words, with * as a prefix', () => {
    assert.deepEqual(bannedHits('They went to war at dawn.', banned), ['war']);
    assert.deepEqual(bannedHits('A warm and wary welcome.', banned), []);
    assert.deepEqual(bannedHits('Damnable weather, damned rain.', banned), ['damn*']);
    assert.deepEqual(bannedHits('Lordly is fine; the Lord is not.', banned), ['lord']);
    assert.ok(rejectReasons({ text: 'Do not kill the messenger, for he only brings the news.', author: 'Jane Writer' }, ctx).includes('banned word'));
  });

  it('rejects non-English and non-ASCII-letter texts', () => {
    assert.ok(rejectReasons({ text: 'Arma virumque cano, Troiae qui primus ab oris Italiam venit.', author: 'Jane Writer' }, ctx).includes('not English'));
    assert.ok(rejectReasons({ text: 'The naïve café owner said that it is good to be here.', author: 'Jane Writer' }, ctx).includes('unsupported characters'));
  });

  it('dedupes on normalised text, first occurrence wins', () => {
    const { kept, rejected } = filterCandidates(
      [
        { text: good, author: 'Jane Writer', n: 1 },
        { text: good.toUpperCase().replace(/ /g, '  '), author: 'Jane Writer', n: 2 },
      ],
      ctx,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0].n, 1);
    assert.equal(rejected.get('duplicate'), 1);
  });

  it('cleans Bartlett markup', () => {
    assert.equal(cleanText("'T is a tree 's [12-3] _fault_--now."), "'Tis a tree's fault—now.");
    assert.equal(cleanText('Cæsar\n    came'), 'Caesar came');
  });
});

describe('review sheet', () => {
  const works = { 'Jane Writer': { 'Collected Essays': 1850 }, 'Alias Author': { '*': 1740 } };
  const candidates = [
    { text: good, author: 'Jane Writer', work: 'Collected Essays. Essay iv', source: 'Collected Essays. Essay iv.', page: 10 },
    { text: 'A lesser line that has no year and trails off into the', author: 'Jane Writer', work: 'Unknown Book', source: 'Unknown Book.' },
    { text: 'Small deeds done are better than great deeds planned, they say.', author: 'A. Author', work: 'Letters', source: 'Letters.' },
    { text: 'The war was long and cruel, and nobody wanted it at all.', author: 'Jane Writer', work: 'Collected Essays', source: 'x' },
  ];
  const { rows } = buildReviewRows(candidates, { authors, works, banned, ids: { byText: {} } });

  it('resolves aliases, years and notes, and leaves decision blank', () => {
    assert.equal(rows.length, 3);
    for (const r of rows) assert.equal(r.decision, '');
    const alias = rows.find((r) => r.author === 'Alias Author');
    assert.equal(alias.workYear, 1740);
    assert.match(alias.notes, /author default/);
    const noYear = rows.find((r) => r.work === 'Unknown Book');
    assert.equal(noYear.workYear, '');
    assert.match(noYear.notes, /needs year/);
  });

  it('sorts the clean, dated quote above the fragment with no year', () => {
    assert.equal(rows[0].text, good);
    assert.equal(rows.at(-1).work, 'Unknown Book');
  });

  it('round-trips through CSV with the required columns', () => {
    const parsed = readCsvObjects(reviewCsv(rows));
    assert.deepEqual(Object.keys(parsed[0]), ['id_hint', 'decision', 'text', 'author', 'authorDates', 'work', 'workYear', 'topics', 'notes']);
    assert.equal(parsed[0].text, good);
    assert.equal(parsed.length, rows.length);
  });
});

describe('work-year lookup', () => {
  const works = { A: { Hamlet: 1603, 'King Henry V': 1600, 'King Henry VI': 1623 }, B: { '*': 1700, Special: 1650 } };
  it('matches exact and prefix-with-punctuation keys, longest first', () => {
    assert.equal(lookupWorkYear(works, 'A', 'Hamlet')?.year, 1603);
    assert.equal(lookupWorkYear(works, 'A', 'King Henry VI. Part II')?.year, 1623);
    assert.equal(lookupWorkYear(works, 'A', 'King Henry V. Prologue')?.year, 1600);
    assert.equal(lookupWorkYear(works, 'A', 'Hamletmachine'), undefined);
  });
  it('falls back to the author default', () => {
    assert.deepEqual(lookupWorkYear(works, 'B', 'Anything'), { year: 1700, how: 'author default' });
    assert.equal(lookupWorkYear(works, 'B', 'Special')?.year, 1650);
  });
});

describe('ID stability', () => {
  it('assigns new ids from 1, append-only', () => {
    const { ids, assigned } = assignIds({ next: 1, byText: {} }, ['Alpha one two three.', 'Beta one two three.']);
    assert.deepEqual(assigned, [1, 2]);
    assert.equal(ids.next, 3);
  });

  it('keeps an existing id for the same (normalised) text regardless of order or punctuation', () => {
    const first = assignIds({ next: 1, byText: {} }, ['Alpha one.', 'Beta two.']);
    const second = assignIds(first.ids, ['Gamma three.', 'BETA, two!', 'alpha ONE']);
    assert.deepEqual(second.assigned, [3, 2, 1]);
  });

  it('never reuses an id, even after its text is dropped', () => {
    const first = assignIds({ next: 1, byText: {} }, ['Alpha one.', 'Beta two.', 'Gamma three.']);
    // Gamma (3) is dropped from the kept list; a brand-new text must not get 3.
    const second = assignIds(first.ids, ['Alpha one.', 'Delta four.']);
    assert.deepEqual(second.assigned, [1, 4]);
    // Even if ids.next was hand-lowered, used ids are never handed out again.
    const third = assignIds({ ...second.ids, next: 2 }, ['Epsilon five.']);
    assert.deepEqual(third.assigned, [5]);
    assert.ok(!Object.isFrozen(first.ids.byText));
    assert.equal(first.ids.byText.gammathree, 3, 'input registry is not mutated');
  });

  it('does not reuse shipped or retired ids missing from byText', () => {
    const { assigned } = assignIds({ next: 1, byText: {}, shipped: [7], retired: [9] }, ['New text here.']);
    assert.deepEqual(assigned, [10]);
  });

  const mk = (text) => ({ text, author: 'Jane Writer', work: 'Collected Essays', workYear: 1850, topics: [] });

  it('retires, never removes, quotes from the previous DB', () => {
    const one = assembleDb([mk('First kept quote text.'), mk('Second kept quote text.')], { authors, ids: { next: 1, byText: {} } });
    assert.deepEqual(one.db.quotes.map((q) => q.id), [1, 2]);
    assert.deepEqual(one.ids.shipped, [1, 2]);
    const two = assembleDb([mk('Second kept quote text.'), mk('Third kept quote text.')], { authors, ids: one.ids, previous: one.db });
    const byId = Object.fromEntries(two.db.quotes.map((q) => [q.id, q]));
    assert.deepEqual(Object.keys(byId).map(Number), [1, 2, 3]);
    assert.equal(byId[1].retired, true);
    assert.equal(byId[2].retired, undefined);
    assert.equal(byId[3].text, 'Third kept quote text.');
    assert.deepEqual(two.ids.retired, [1]);
    // Kept again later: same id, no longer retired.
    const three = assembleDb([mk('First kept quote text.')], { authors, ids: two.ids, previous: two.db });
    assert.equal(three.db.quotes.find((q) => q.id === 1).retired, undefined);
    assert.deepEqual(three.ids.retired, [2, 3]);
  });

  it('keeps the previous dailyOrder and appends deterministically', () => {
    const texts = Array.from({ length: 20 }, (_, i) => mk(`Quote number ${'abcdefghijklmnopqrst'[i]} for the daily list.`));
    const a = assembleDb(texts.slice(0, 10), { authors, ids: { next: 1, byText: {} } });
    const b = assembleDb(texts.slice(0, 10), { authors, ids: { next: 1, byText: {} } });
    assert.deepEqual(a.db.dailyOrder, b.db.dailyOrder, 'seeded, deterministic');
    assert.equal(a.db.dailyOrder.length, 10);
    const c = assembleDb(texts, { authors, ids: a.ids, previous: a.db });
    assert.deepEqual(c.db.dailyOrder.slice(0, 10), a.db.dailyOrder, 'existing days never move');
    assert.equal(new Set(c.db.dailyOrder).size, 20);
    assert.deepEqual(seededShuffle([1, 2, 3, 4, 5], 'x'), seededShuffle([1, 2, 3, 4, 5], 'x'));
  });

  it('puts long quotes on Sunday slots (Sunday specials)', () => {
    // Launch (slot 0) is Friday 1 Jan 2027, so slot 2 is the first Sunday.
    assert.equal(isSundaySlot(2), true);
    assert.equal(isSundaySlot(9), true);
    assert.equal(isSundaySlot(3), false);
    const long = 'x'.repeat(SUNDAY_MIN_CHARS);
    const names = 'abcdefghijklmn';
    const texts = Array.from({ length: 14 }, (_, i) => mk(i < 2 ? 'Long quote ' + names[i] + ' ' + long + '.' : 'Short quote ' + names[i] + ' here.'));
    const { db } = assembleDb(texts, { authors, ids: { next: 1, byText: {} } });
    const text = (id) => db.quotes.find((q) => q.id === id).text;
    assert.ok(text(db.dailyOrder[2]).length >= SUNDAY_MIN_CHARS);
    assert.ok(text(db.dailyOrder[9]).length >= SUNDAY_MIN_CHARS);
    assert.ok(text(db.dailyOrder[0]).length < SUNDAY_MIN_CHARS);
  });

  it('passes the Library set and fact through to the DB', () => {
    const fact = 'She kept bees in her garden for forty years.';
    const withExtras = { 'Jane Writer': { ...authors['Jane Writer'], set: 'poets', fact } };
    const { db } = assembleDb([mk('A short and simple quote for the extras.')], { authors: withExtras, ids: { next: 1, byText: {} } });
    assert.deepEqual(db.authors['Jane Writer'], { dates: '1800–1870', bio: 'Test author.', set: 'poets', fact });
  });

  it('writes the QuoteDb record shape', () => {
    const { db } = assembleDb([mk('A short and simple quote to check the record shape.')], { authors, ids: { next: 1, byText: {} } });
    assert.equal(db.version, 'v1');
    assert.deepEqual(db.authors, { 'Jane Writer': { dates: '1800–1870', bio: 'Test author.' } });
    assert.deepEqual(Object.keys(db.quotes[0]).sort(), [
      'author', 'authorDates', 'difficulty', 'id', 'sourceCollection', 'sourceEdition', 'text', 'topics', 'work', 'workYear',
    ]);
  });
});

describe('build row acceptance', () => {
  const row = (o) => ({ decision: 'keep', text: good, author: 'Jane Writer', work: 'Collected Essays', workYear: '1850', topics: 'time;work', ...o });
  it('takes keep and fix, skips drop/blank, and skips rows without a year', () => {
    const { accepted, warnings } = acceptRows(
      [
        row(),
        row({ decision: 'fix', text: 'Patience and time do more than strength or rage ever could.' }),
        row({ decision: 'drop', text: 'Dropped text that is long enough to pass.' }),
        row({ decision: '', text: 'Undecided text that is long enough to pass.' }),
        row({ text: 'This kept row has no year so build must skip it.', workYear: '' }),
        row({ text: 'This kept row was published far too late for us.', workYear: '1931' }),
        row({ text: 'Alias rows resolve to the canonical author name.', author: 'A. Author' }),
      ],
      ctx,
    );
    assert.equal(accepted.length, 3);
    assert.deepEqual(accepted[0].topics, ['time', 'work']);
    assert.equal(accepted[2].author, 'Alias Author');
    assert.equal(warnings.length, 2);
  });
});

describe('difficulty bands', () => {
  it('uses one band per length: ≤80 easy, ≤110 medium, ≤135 hard, else expert', () => {
    assert.equal(difficultyFor(40), 'easy');
    assert.equal(difficultyFor(80), 'easy');
    assert.equal(difficultyFor(81), 'medium');
    assert.equal(difficultyFor(110), 'medium');
    assert.equal(difficultyFor(111), 'hard');
    assert.equal(difficultyFor(135), 'hard');
    assert.equal(difficultyFor(136), 'expert');
    assert.equal(difficultyFor(160), 'expert');
  });
});

describe('fetch + extract', () => {
  const raw = [
    'The Project Gutenberg eBook of Familiar Quotations',
    'licence text',
    '*** START OF THE PROJECT GUTENBERG EBOOK FAMILIAR QUOTATIONS ***',
    'Produced by Someone',
    '',
    'FAMILIAR QUOTATIONS.',
    '',
    'JANE WRITER.[5-1] 1800-1870.',
    '',
    '    Patience and time do more',
    '    Than strength or passion.[5-2]',
    '',
    '_Collected Essays. Essay iv. Line 3._',
    '',
    'FOOTNOTES:',
    '',
    '[5-2] A note.--OTHER: _Thing._',
    '',
    'LORD BYRON 1788-1824.',
    '',
    '    A line by the poet.',
    '',
    '_Don Juan. Canto i._',
    '',
    'THE BIBLE.',
    '',
    '    Not extracted.',
    '',
    '_Genesis._',
    '*** END OF THE PROJECT GUTENBERG EBOOK FAMILIAR QUOTATIONS ***',
    'more licence text',
  ].join('\n');

  it('strips the Gutenberg header, credit and licence', () => {
    const body = stripGutenberg(raw);
    assert.ok(body.startsWith('FAMILIAR QUOTATIONS.'));
    assert.ok(!/Project Gutenberg|licence/.test(body));
  });

  it('extracts author, dates, text, work and page; skips footnotes and the Bible', () => {
    const out = extract(stripGutenberg(raw));
    assert.equal(out.length, 2);
    assert.equal(out[0].author, 'Jane Writer');
    assert.equal(out[0].bartlettDates, '1800-1870.');
    assert.equal(out[0].text, 'Patience and time do more Than strength or passion.');
    assert.equal(out[0].work, 'Collected Essays');
    assert.equal(out[0].page, 5);
    assert.equal(out[1].author, 'Lord Byron');
    assert.equal(out[1].work, 'Don Juan');
  });

  it('parses headings and work titles', () => {
    assert.deepEqual(matchHeading('GEOFFREY CHAUCER. 1328-1400.'), { name: 'GEOFFREY CHAUCER', dates: '1328-1400.' });
    assert.equal(matchHeading('PRINCESS AMELIA (1783-1810).'), null);
    assert.equal(matchHeading('ISAAC H. BROMLEY (1833- ----): _Editorial._'), null);
    assert.equal(parseWork('King Henry IV. Part I. Act ii. Sc. 4.').work, 'King Henry IV. Part I');
    assert.equal(parseWork('Epistle to Dr. Arbuthnot. Line 3.').work, 'Epistle to Dr. Arbuthnot');
    assert.equal(parseWork("L'Allegro. Line 25.").work, "L'Allegro");
    assert.deepEqual(parseWork("Maxims prefixed to Poor Richard's Almanac, 1757."), { work: "Maxims prefixed to Poor Richard's Almanac", year: 1757 });
  });
});
