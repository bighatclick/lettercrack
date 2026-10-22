import {
  addDays,
  archiveDates,
  dailyIndex,
  dailyQuoteId,
  daysBetween,
  isLocalDate,
  isoWeek,
  isPlayableDaily,
  noteSeenDate,
  toLocalDate,
} from '../daily';

const LAUNCH = '2027-01-01';
const ORDER = Array.from({ length: 365 }, (_, i) => 1000 + i);

const ZONES = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Kiritimati', // UTC+14
  'Pacific/Pago_Pago', // UTC−11
];

/** Walks hourly instants and checks the daily index never skips or repeats a day, through every DST change. */
function walk(dateOf: (d: Date) => string, label: string) {
  const start = Date.UTC(2026, 11, 31, 12);
  let prevDate = '';
  let prevIndex = -1;
  for (let h = 0; h < 24 * 1100; h++) {
    const date = dateOf(new Date(start + h * 3_600_000));
    if (date === prevDate) continue;
    const idx = dailyIndex(date, LAUNCH);
    if (prevIndex >= 0 && idx !== prevIndex + 1 && !(idx === 0 && prevIndex === 0)) {
      throw new Error(`${label}: ${prevDate} (#${prevIndex}) → ${date} (#${idx})`);
    }
    prevDate = date;
    prevIndex = idx;
  }
  expect(prevIndex).toBeGreaterThan(1090);
}

describe('daily (F5)', () => {
  it.each(ZONES)('steps exactly one daily per local midnight in %s', (tz) => {
    walk((d) => toLocalDate(d, tz), tz);
  });

  it('device path agrees with the zone-explicit path in the process timezone', () => {
    // CI reruns this file with TZ set to each of ZONES (env must be set before Node starts).
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // If CI asked for a zone, make sure Node actually applied it (it does on Linux, not on Windows).
    if (process.env.TZ) expect(tz).toBe(process.env.TZ);
    for (let h = 0; h < 24 * 400; h += 7) {
      const d = new Date(Date.UTC(2027, 0, 1) + h * 3_600_000);
      if (toLocalDate(d) !== toLocalDate(d, tz)) throw new Error(`${tz}: ${d.toISOString()}`);
    }
    walk((d) => toLocalDate(d), `device(${tz})`);
  });

  it('gives every player the same quote for the same local date', () => {
    expect(dailyQuoteId('2027-01-01', ORDER, LAUNCH)).toBe(1000);
    expect(dailyQuoteId('2027-03-14', ORDER, LAUNCH)).toBe(1000 + 72);
    expect(dailyQuoteId('2027-12-31', ORDER, LAUNCH)).toBe(1364);
    expect(dailyQuoteId('2028-01-01', ORDER, LAUNCH)).toBe(1000); // wraps after the pool
  });

  it('clamps dates before launch to the first daily', () => {
    expect(dailyIndex('2026-10-22', LAUNCH)).toBe(0);
  });

  it('never makes a future daily playable', () => {
    expect(isPlayableDaily('2027-02-02', '2027-02-01', LAUNCH)).toBe(false);
    expect(isPlayableDaily('2027-02-01', '2027-02-01', LAUNCH)).toBe(true);
    expect(isPlayableDaily('2026-12-31', '2027-02-01', LAUNCH)).toBe(false);
    expect(isPlayableDaily('2027-02-30', '2027-03-01', LAUNCH)).toBe(false);
  });

  it('lists archive dates from yesterday back to launch', () => {
    expect(archiveDates('2027-01-04', LAUNCH)).toEqual(['2027-01-03', '2027-01-02', '2027-01-01']);
    expect(archiveDates(LAUNCH, LAUNCH)).toEqual([]);
  });

  it('does date arithmetic across month, year and leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(daysBetween('2027-01-01', '2028-01-01')).toBe(365);
    expect(isLocalDate('2027-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
  });

  it('computes ISO weeks (Monday start, week 1 contains Jan 4)', () => {
    expect(isoWeek('2027-01-01')).toBe('2026-W53'); // a Friday
    expect(isoWeek('2027-01-04')).toBe('2027-W01'); // Monday
    expect(isoWeek('2027-01-10')).toBe('2027-W01'); // Sunday
    expect(isoWeek('2027-01-11')).toBe('2027-W02');
    expect(isoWeek('2028-12-31')).toBe('2028-W52');
  });

  it('only moves the highest-seen date forward', () => {
    expect(noteSeenDate(null, '2027-01-05')).toBe('2027-01-05');
    expect(noteSeenDate('2027-01-05', '2027-01-03')).toBe('2027-01-05');
    expect(noteSeenDate('2027-01-05', '2027-01-06')).toBe('2027-01-06');
  });
});
