import { addDays } from '../daily';
import { displayStreak, emptyStreak, recordDailySolve, type StreakState } from '../streak';

/** Solves the daily on each given date, in order. */
function play(dates: string[], start: StreakState = emptyStreak()): StreakState {
  return dates.reduce((s, d) => recordDailySolve(s, d, d).state, start);
}

// 2027-01-04 is a Monday (ISO week 2027-W01).
const MON = '2027-01-04';
const day = (n: number) => addDays(MON, n);

describe('streak', () => {
  it('counts consecutive dailies solved on their own date', () => {
    const s = play([day(0), day(1), day(2)]);
    expect(s.streak).toBe(3);
    expect(s.best).toBe(3);
    expect(displayStreak(s, day(2))).toBe(3);
    expect(displayStreak(s, day(3))).toBe(3); // today's daily still open
  });

  it('bridges one missed day per week with the free freeze', () => {
    const r = recordDailySolve(play([day(0), day(1)]), day(3), day(3)); // missed day 2 (Wed)
    expect(r.freezeUsed).toBe(true);
    expect(r.state.streak).toBe(3);
    expect(r.state.freezeUsedWeek).toBe('2027-W01');
  });

  it('cannot use a second freeze in the same week', () => {
    const s = play([day(0), day(2), day(4)]); // missed Tue and Thu of the same week
    expect(s.streak).toBe(1);
    expect(s.best).toBe(2);
  });

  it('gets a fresh freeze the next week', () => {
    const s = play([day(0), day(2), day(3), day(4), day(5), day(6), day(8)]); // missed Tue W01 and Tue W02
    expect(s.streak).toBe(7);
  });

  it('breaks after two missed days in one week, and shows 0 until the next solve', () => {
    const s = play([day(0), day(1)]);
    expect(displayStreak(s, day(4))).toBe(0); // missed Wed and Thu
    expect(recordDailySolve(s, day(4), day(4)).state.streak).toBe(1);
  });

  it('archive solves never change the streak', () => {
    const s = play([day(0)]);
    const r = recordDailySolve(s, day(-3), day(1));
    expect(r.credited).toBe(false);
    expect(r.state).toBe(s);
  });

  it('a daily counts once', () => {
    const s = play([day(0)]);
    expect(recordDailySolve(s, day(0), day(0)).state).toBe(s);
  });

  it('gives no credit after the clock is wound back below a date already seen', () => {
    const s: StreakState = { ...play([day(0)]), highestDateSeen: day(3) };
    expect(recordDailySolve(s, day(2), day(2)).credited).toBe(false);
  });

  it('keeps the best streak after a reset', () => {
    const s = play([day(0), day(1), day(2), day(3), day(10)]);
    expect(s.streak).toBe(1);
    expect(s.best).toBe(4);
  });
});
