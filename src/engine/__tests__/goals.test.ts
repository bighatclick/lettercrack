import { addDays } from '../daily';
import { emptyGoals, GOAL_TARGETS, goalProgress, goalsFor, LONG_QUOTE_LETTERS, recordGoalSolve, type SolveEvent } from '../goals';

const DAY = '2027-03-01';
const level: SolveEvent = { mode: 'level', dailyToday: false, clean: false, difficulty: 'medium', letters: 20 };
const daily: SolveEvent = { mode: 'daily', dailyToday: true, clean: false, difficulty: 'medium', letters: 20 };

describe('daily goals', () => {
  it("always has 3 goals, today's daily first, the same for everyone on a date", () => {
    for (let i = 0; i < 400; i++) {
      const d = addDays(DAY, i);
      const g = goalsFor(d);
      expect(g).toHaveLength(3);
      expect(g[0]).toBe('daily');
      expect(new Set(g).size).toBe(3);
      expect(g.includes('levels2') && g.includes('levels3')).toBe(false);
      expect(goalsFor(d)).toEqual(g);
    }
  });

  it('varies from day to day', () => {
    const sets = new Set(Array.from({ length: 30 }, (_, i) => goalsFor(addDays(DAY, i)).join()));
    expect(sets.size).toBeGreaterThan(5);
  });

  it('counts progress, caps at the target and reports goals as they complete', () => {
    const r1 = recordGoalSolve(emptyGoals(), DAY, daily);
    expect(r1.completed).toContain('daily');
    expect(goalProgress(r1.state, DAY)[0]).toEqual({ id: 'daily', target: 1, value: 1, done: true });
    // Another daily-style event never pushes past the target or re-reports it.
    const r2 = recordGoalSolve(r1.state, DAY, daily);
    expect(r2.completed).not.toContain('daily');
    expect(goalProgress(r2.state, DAY)[0]?.value).toBe(1);
  });

  it('grants the reward exactly once, when all three are done', () => {
    const big: SolveEvent = { mode: 'level', dailyToday: false, clean: true, difficulty: 'expert', letters: 200 };
    let g = recordGoalSolve(emptyGoals(), DAY, daily).state;
    let rewards = 0;
    for (let i = 0; i < 4; i++) {
      const r = recordGoalSolve(g, DAY, big);
      if (r.rewardNow) rewards++;
      g = r.state;
    }
    expect(rewards).toBe(1);
    expect(g.rewarded).toBe(true);
    expect(goalProgress(g, DAY).every((v) => v.done)).toBe(true);
  });

  it('does not reward before every goal is done', () => {
    expect(recordGoalSolve(emptyGoals(), DAY, level).rewardNow).toBe(false);
  });

  it('starts fresh on a new day', () => {
    const g = recordGoalSolve(emptyGoals(), DAY, daily).state;
    const next = addDays(DAY, 1);
    expect(goalProgress(g, next).every((v) => v.value === 0)).toBe(true);
    const r = recordGoalSolve(g, next, level);
    expect(r.state.date).toBe(next);
    expect(r.state.rewarded).toBe(false);
  });

  it("archive dailies don't count as today's daily", () => {
    expect(recordGoalSolve(emptyGoals(), DAY, { ...daily, dailyToday: false }).completed).not.toContain('daily');
  });

  it('counts letters and long quotes', () => {
    const days = Array.from({ length: 90 }, (_, i) => addDays(DAY, i));
    const d = days.find((x) => goalsFor(x).includes('letters150'))!;
    const r = recordGoalSolve(emptyGoals(), d, { ...level, letters: 100 });
    expect(goalProgress(r.state, d).find((v) => v.id === 'letters150')?.value).toBe(100);
    const l = days.find((x) => goalsFor(x).includes('long'))!;
    expect(recordGoalSolve(emptyGoals(), l, { ...level, letters: LONG_QUOTE_LETTERS - 1 }).completed).not.toContain('long');
    expect(recordGoalSolve(emptyGoals(), l, { ...level, letters: LONG_QUOTE_LETTERS }).completed).toContain('long');
  });

  it('has a positive target for every goal', () => {
    for (const v of Object.values(GOAL_TARGETS)) expect(v).toBeGreaterThan(0);
  });
});
