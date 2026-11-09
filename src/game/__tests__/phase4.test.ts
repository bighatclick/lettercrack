import { createContent, type QuoteDb } from '@/content/quotes';
import { defaultRoot, type Root } from '@/data/schema';
import { createPuzzle, puzzleReducer } from '@/engine/puzzle';
import { pickNextQuote } from '@/engine/picker';

import { archiveMonths, dailyStatus, settleLegacyDailies } from '../archive';
import { completeOnboarding, needsOnboarding, ONBOARDING_TEXT, onboardingInit } from '../onboarding';
import { noteReminderOffered, REMINDER_DAYS_AHEAD, reminderDates, shouldOfferReminder } from '../reminder';
import { feedbackMailto, reportQuote } from '../report';
import { noteReviewAsked, shouldAskForReview } from '../review';
import { computeStats } from '../stats';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const LAUNCH = '2027-01-01';

const q = (id: number, author: string, text: string) => ({
  id,
  text,
  author,
  authorDates: '1800–1880',
  work: 'W',
  workYear: 1850,
  sourceCollection: 'S',
  sourceEdition: 'E',
  topics: [],
  difficulty: 'easy' as const,
});
const db: QuoteDb = {
  version: 'test',
  authors: { A: { dates: 'd', bio: 'b' }, B: { dates: 'd', bio: 'b' }, C: { dates: 'd', bio: 'b' } },
  dailyOrder: [1, 2, 3],
  quotes: [q(1, 'A', 'one'), q(2, 'B', 'two'), q(3, 'A', 'three'), q(4, 'C', 'four'), q(5, 'B', 'five')],
};
const content = createContent(db);
const solvedRec = (date: string, clean = true, timeMs: number | null = null) => ({ date, clean, timeMs, difficulty: 'easy' as const });

describe('stats (S5)', () => {
  it('counts solves, clean solves and favourite authors', () => {
    const r = defaultRoot(NOW);
    r.progress.solved = { 1: solvedRec('2027-01-01'), 3: solvedRec('2027-01-02', false), 2: solvedRec('2027-01-02'), 4: solvedRec('2027-01-03') };
    const s = computeStats(r, content, '2027-01-03');
    expect(s.solved).toBe(4);
    expect(s.clean).toBe(3);
    expect(s.favouriteAuthors).toEqual([
      { author: 'A', count: 2 },
      { author: 'B', count: 1 },
      { author: 'C', count: 1 },
    ]);
  });

  it('shows average time only when the timer setting is on', () => {
    const r = defaultRoot(NOW);
    r.progress.solved = { 1: solvedRec('2027-01-01', true, 60_000), 2: solvedRec('2027-01-01', true, 120_000), 3: solvedRec('2027-01-01') };
    expect(computeStats(r, content, '2027-01-02').averageMs).toBeNull();
    r.settings.showTimer = true;
    expect(computeStats(r, content, '2027-01-02').averageMs).toBe(90_000);
  });
});

describe('archive (S4)', () => {
  it('lists past dailies by month, newest month first, with weekday offsets', () => {
    const months = archiveMonths(defaultRoot(NOW), content, '2027-02-03', LAUNCH);
    expect(months.map((m) => m.month)).toEqual(['2027-02', '2027-01']);
    expect(months[1]!.days).toHaveLength(31);
    expect(months[1]!.offset).toBe(4); // 1 Jan 2027 is a Friday
    expect(months[0]!.days.map((d) => d.day)).toEqual([1, 2]); // today (3rd) is on Home, not in the archive
  });

  it('marks solved, started and open days', () => {
    const r = defaultRoot(NOW);
    r.daily.solvedDates = ['2027-01-01'];
    r.progress.solved = { 2: solvedRec('2027-01-05') }; // the 2 Jan daily, solved later from the archive
    r.progress.lateDailies = ['2027-01-02'];
    r.inProgress['daily:2027-01-03'] = {} as Root['inProgress'][string];
    expect(dailyStatus(r, content, '2027-01-01', LAUNCH)).toBe('solved');
    expect(dailyStatus(r, content, '2027-01-02', LAUNCH)).toBe('solved');
    expect(dailyStatus(r, content, '2027-01-03', LAUNCH)).toBe('inProgress');
    expect(dailyStatus(r, content, '2027-01-04', LAUNCH)).toBe('open');
  });

  it('does not count an old solve of the same quote before that daily as solving it', () => {
    const r = defaultRoot(NOW);
    // Quote 1 is the daily for 1 Jan and again for 4 Jan (order wraps every 3 days).
    r.progress.solved = { 1: solvedRec('2027-01-01') };
    expect(dailyStatus(r, content, '2027-01-04', LAUNCH)).toBe('open');
  });

  it('does not count a later solve of the same quote on another day as solving this one (D20)', () => {
    const r = defaultRoot(NOW);
    // Quote 1 is the daily for 1 Jan and again for 4 Jan; only 4 Jan was played.
    r.daily.solvedDates = ['2027-01-04'];
    r.progress.solved = { 1: solvedRec('2027-01-04') };
    expect(dailyStatus(r, content, '2027-01-04', LAUNCH)).toBe('solved');
    expect(dailyStatus(r, content, '2027-01-01', LAUNCH)).toBe('open');
  });

  it('keeps the old rule for solves from before v5, up to the cutoff', () => {
    const r = defaultRoot(NOW);
    r.progress.solved = { 2: solvedRec('2027-01-05') };
    r.progress.legacyDailyCutoff = '2027-01-06';
    expect(dailyStatus(r, content, '2027-01-02', LAUNCH)).toBe('solved');
    // A solve record newer than the cutoff is a v5 solve: only lateDailies counts.
    r.progress.solved = { 2: solvedRec('2027-01-07') };
    expect(dailyStatus(r, content, '2027-01-02', LAUNCH)).toBe('open');
  });

  it('settles the old rule once: its days are kept, and later solves no longer spread to other days', () => {
    const r = defaultRoot(NOW);
    r.progress.solved = { 2: solvedRec('2027-01-05') };
    r.progress.legacyDailyCutoff = '2027-01-06';
    const settled = settleLegacyDailies(r, content, LAUNCH);
    // Quote 2 is the daily for 2, 5 and 8 Jan: the old rule marked 2 and 5 Jan.
    expect(settled.progress.lateDailies).toEqual(['2027-01-02', '2027-01-05']);
    expect(settled.progress.legacyDailyCutoff).toBeNull();
    expect(settleLegacyDailies(settled, content, LAUNCH)).toBe(settled);
    // A new solve of quote 2 on 9 Jan doesn't mark 8 Jan, and the settled days stay solved.
    settled.progress.solved = { 2: solvedRec('2027-01-09') };
    expect(dailyStatus(settled, content, '2027-01-08', LAUNCH)).toBe('open');
    expect(dailyStatus(settled, content, '2027-01-02', LAUNCH)).toBe('solved');
  });

  it('is empty on launch day', () => {
    expect(archiveMonths(defaultRoot(NOW), content, LAUNCH, LAUNCH)).toEqual([]);
  });
});

describe('review prompt (F8)', () => {
  const ready = (): Root => {
    const r = defaultRoot(NOW - 3 * DAY);
    r.progress.solved = { 1: solvedRec('a'), 2: solvedRec('b'), 3: solvedRec('c') };
    return r;
  };
  const ok = { cleanSolve: true, justShowedAd: false };

  it('asks after the 3rd hint-free solve, ≥ 2 days after install', () => {
    expect(shouldAskForReview(ready(), NOW, ok)).toBe(true);
    const young = { ...ready(), installedAt: NOW - DAY };
    expect(shouldAskForReview(young, NOW, ok)).toBe(false);
    const two = ready();
    delete two.progress.solved[3];
    expect(shouldAskForReview(two, NOW, ok)).toBe(false);
  });

  it('never after a hinted solve or right after an ad', () => {
    expect(shouldAskForReview(ready(), NOW, { cleanSolve: false, justShowedAd: false })).toBe(false);
    expect(shouldAskForReview(ready(), NOW, { cleanSolve: true, justShowedAd: true })).toBe(false);
  });

  it('at most 3 times a year, 30 days apart', () => {
    let r = ready();
    let asked = 0;
    for (let day = 0; day < 365; day++) {
      const now = NOW + day * DAY;
      if (shouldAskForReview(r, now, ok)) {
        asked++;
        r = noteReviewAsked(r, now);
      }
    }
    expect(asked).toBe(3);
    expect(shouldAskForReview(noteReviewAsked(ready(), NOW), NOW + 10 * DAY, ok)).toBe(false);
  });
});

describe('daily reminder (F9)', () => {
  it('is offered once, after the 2nd daily solve', () => {
    const r = defaultRoot(NOW);
    r.daily.solvedDates = ['2027-01-01'];
    expect(shouldOfferReminder(r)).toBe(false);
    r.daily.solvedDates.push('2027-01-02');
    expect(shouldOfferReminder(r)).toBe(true);
    expect(shouldOfferReminder(noteReminderOffered(r))).toBe(false);
    expect(shouldOfferReminder({ ...r, settings: { ...r.settings, dailyReminder: true } })).toBe(false);
  });

  it('skips today once solved or past 9am', () => {
    expect(reminderDates('2027-01-10', 7, false)[0]).toBe('2027-01-10');
    expect(reminderDates('2027-01-10', 7, true)[0]).toBe('2027-01-11');
    expect(reminderDates('2027-01-10', 10, false)[0]).toBe('2027-01-11');
    expect(reminderDates('2027-01-31', 10, false)).toHaveLength(REMINDER_DAYS_AHEAD);
    expect(reminderDates('2027-01-31', 10, false)[0]).toBe('2027-02-01');
  });
});

describe('report quote (§4.3)', () => {
  it('hides the quote from level picks and drops its save, idempotently', () => {
    let r = defaultRoot(NOW);
    r.inProgress['level:4'] = {} as Root['inProgress'][string];
    r = reportQuote(r, 4);
    expect(r.progress.reportedQuoteIds).toEqual([4]);
    expect(r.inProgress['level:4']).toBeUndefined();
    expect(reportQuote(r, 4)).toBe(r);
    const pick = pickNextQuote({ pool: [{ id: 4, length: 50 }], seen: [], exclude: new Set(r.progress.reportedQuoteIds), difficulty: 'easy' });
    expect(pick).toBeNull();
  });

  it('builds a mailto with the reported quotes and nothing else personal', () => {
    const r = reportQuote(defaultRoot(NOW), 4);
    const url = feedbackMailto(r, content, 'Feedback', '1.0.0');
    expect(url.startsWith('mailto:hello@lettercrack.app?subject=Feedback&body=')).toBe(true);
    const body = decodeURIComponent(url.split('body=')[1]!);
    expect(body).toContain('#4 C: four');
    expect(body).toContain('App 1.0.0, quotes test');
  });
});

describe('onboarding (S8)', () => {
  it('is a tiny solvable puzzle with no givens', () => {
    let s = createPuzzle(onboardingInit(true));
    expect(s.plain).toBe(ONBOARDING_TEXT);
    expect(s.givens).toEqual([]);
    let k = 0;
    for (let i = 0; i < s.plain.length; i++) {
      const c = s.plain[i]!;
      if (c >= 'A' && c <= 'Z' && s.entries[i] !== c) {
        s = puzzleReducer(puzzleReducer(s, { type: 'select', index: i }), { type: 'input', letter: c, keyId: ++k });
      }
    }
    expect(s.solved).toBe(true);
  });

  it('records completion and the chosen difficulty', () => {
    const r = defaultRoot(NOW);
    expect(needsOnboarding(r)).toBe(true);
    const done = completeOnboarding(r, 'hard', NOW + 5);
    expect(needsOnboarding(done)).toBe(false);
    expect(done.settings.defaultDifficulty).toBe('hard');
    expect(done.meta.settingsUpdatedAt).toBe(NOW + 5);
  });
});

describe('retired quotes', () => {
  const retiredDb: QuoteDb = {
    ...db,
    quotes: db.quotes.map((x) => (x.id === 2 || x.id === 5 ? { ...x, retired: true } : x)),
  };
  const c = createContent(retiredDb);

  it('are never offered as levels', () => {
    expect(c.levelPool.map((p) => p.id)).toEqual([4]);
  });

  it('as a daily are swapped for the next live quote, leaving other dates alone', () => {
    expect(c.dailyOrder).toEqual([1, 3, 3]);
  });
});
