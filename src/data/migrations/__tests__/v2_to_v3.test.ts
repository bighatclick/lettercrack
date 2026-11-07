import v2 from '../__fixtures__/v2.json';
import { v2_to_v3 } from '../v2_to_v3';

describe('v2 → v3', () => {
  it('adds empty goals and credits freeze milestones the current streak already passed', () => {
    const out = v2_to_v3(structuredClone(v2) as Record<string, unknown>);
    const daily = out.daily as Record<string, unknown>;
    // The fixture's streak is 37: past the 7- and 30-day milestones.
    expect(daily.milestonesAwarded).toEqual([7, 30]);
    expect(daily.bonusFreezes).toBe(2);
    expect(out.goals).toEqual({ date: null, progress: {}, rewarded: false });
    // Nothing else changes.
    expect({ ...daily, bonusFreezes: undefined, milestonesAwarded: undefined }).toEqual({ ...v2.daily, bonusFreezes: undefined, milestonesAwarded: undefined });
    expect(out.progress).toEqual(v2.progress);
    expect(out.hints).toEqual(v2.hints);
    expect(out.meta).toEqual(v2.meta);
  });

  it('gives a new player no freezes', () => {
    const out = v2_to_v3({ schemaVersion: 2, daily: { streak: 2 } });
    expect(out.daily).toMatchObject({ streak: 2, bonusFreezes: 0, milestonesAwarded: [] });
  });

  it('copes with a save that has no daily block', () => {
    expect(v2_to_v3({ schemaVersion: 2 }).daily).toMatchObject({ bonusFreezes: 0, milestonesAwarded: [] });
  });
});
