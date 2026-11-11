import { makeShiftedDate, parseLocalDateTime } from '../shiftedDate';

describe('makeShiftedDate (E2E test clock)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let offset = 0;
  const Shifted = makeShiftedDate(Date, () => offset);

  beforeEach(() => {
    offset = 0;
  });

  it('shifts "now" by the offset, for new Date() and Date.now()', () => {
    offset = 3 * DAY;
    const real = Date.now();
    expect(Shifted.now() - real).toBeGreaterThanOrEqual(3 * DAY);
    expect(Shifted.now() - real).toBeLessThan(3 * DAY + 1000);
    expect(new Shifted().getTime() - real).toBeGreaterThanOrEqual(3 * DAY);
  });

  it('follows offset changes without being rebuilt', () => {
    offset = -DAY;
    expect(Date.now() - Shifted.now()).toBeGreaterThanOrEqual(DAY - 1000);
    offset = 0;
    expect(Math.abs(Date.now() - Shifted.now())).toBeLessThan(1000);
  });

  it('leaves explicit times, parsing and UTC untouched', () => {
    offset = 10 * DAY;
    expect(new Shifted(0).getTime()).toBe(0);
    expect(new Shifted('2027-01-10T12:00:00Z').toISOString()).toBe('2027-01-10T12:00:00.000Z');
    expect(new Shifted(2027, 0, 10, 9, 30).getHours()).toBe(9);
    expect(Shifted.parse('2027-01-10T00:00:00Z')).toBe(Date.parse('2027-01-10T00:00:00Z'));
    expect(Shifted.UTC(2027, 0, 1)).toBe(Date.UTC(2027, 0, 1));
  });

  it('makes real Date instances', () => {
    const d = new Shifted();
    expect(d).toBeInstanceOf(Date);
    expect(d).toBeInstanceOf(Shifted);
    expect(typeof d.toLocaleDateString()).toBe('string');
  });

  it('returns a shifted string when called without new', () => {
    offset = 400 * DAY;
    const s = (Shifted as unknown as () => string)();
    expect(typeof s).toBe('string');
    expect(new Date(s).getFullYear()).toBeGreaterThan(new Date().getFullYear());
  });
});

describe('parseLocalDateTime', () => {
  it('reads a device-local date and time', () => {
    const t = parseLocalDateTime(Date, '2027-01-10T23:59:30')!;
    const d = new Date(t);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([2027, 0, 10, 23, 59, 30]);
  });

  it('allows leaving out the seconds', () => {
    expect(new Date(parseLocalDateTime(Date, '2028-02-29T05:30')!).getMinutes()).toBe(30);
  });

  it('rejects malformed or impossible dates', () => {
    expect(parseLocalDateTime(Date, 'tomorrow')).toBeNull();
    expect(parseLocalDateTime(Date, '2027-01-10')).toBeNull();
    expect(parseLocalDateTime(Date, '2027-02-30T10:00')).toBeNull();
    expect(parseLocalDateTime(Date, '2027-02-29T10:00')).toBeNull();
  });
});
