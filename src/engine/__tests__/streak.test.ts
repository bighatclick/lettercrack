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

describe('streak milestones and saved freezes', () => {
  const run = (n: number, start: StreakState = emptyStreak()) => play(Array.from({ length: n }, (_, i) => day(i)), start);

  it('celebrates milestones and earns a freeze at 7 days, once', () => {
    const r7 = recordDailySolve(run(6), day(6), day(6));
    expect(r7.milestone).toBe(7);
    expect(r7.freezeEarned).toBe(true);
    expect(r7.state.bonusFreezes).toBe(1);
    expect(r7.state.milestonesAwarded).toEqual([7]);
    const r8 = recordDailySolve(r7.state, day(7), day(7));
    expect(r8.milestone).toBeNull();
    expect(r8.freezeEarned).toBe(false);
    expect(recordDailySolve(run(2), day(2), day(2)).milestone).toBe(3);
  });

  it('never pays the same milestone twice after a broken streak', () => {
    const s = run(7);
    expect(s.bonusFreezes).toBe(1);
    // Break it (a long gap), then rebuild to 7.
    const rebuilt = play(Array.from({ length: 7 }, (_, i) => day(30 + i)), { ...s, bonusFreezes: 0 });
    expect(rebuilt.streak).toBe(7);
    expect(rebuilt.bonusFreezes).toBe(0);
  });

  it('uses a saved freeze when the weekly one is already used', () => {
    // Missed Tue and Thu of the same week: the weekly freeze covers one, a saved one the other.
    const s = play([day(0), day(2), day(4)], { ...emptyStreak(), bonusFreezes: 1 });
    expect(s.streak).toBe(3);
    expect(s.bonusFreezes).toBe(0);
  });

  it('keeps the streak alive on Home while a saved freeze could still cover the gap', () => {
    const s = play([day(0), day(2)], { ...emptyStreak(), bonusFreezes: 1 }); // weekly freeze used on Tue
    expect(displayStreak(s, day(4))).toBe(2); // Thu missed too: the saved freeze covers it
    expect(displayStreak({ ...s, bonusFreezes: 0 }, day(4))).toBe(0);
  });

  it('caps saved freezes', () => {
    const r = recordDailySolve({ ...run(6), bonusFreezes: 3 }, day(6), day(6));
    expect(r.state.bonusFreezes).toBe(3);
    expect(r.freezeEarned).toBe(false);
    expect(r.state.milestonesAwarded).toEqual([7]);
  });
});
