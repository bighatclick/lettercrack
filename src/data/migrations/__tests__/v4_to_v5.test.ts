import v4 from '../__fixtures__/v4.json';
import { v4_to_v5 } from '../v4_to_v5';

describe('v4 → v5', () => {
  it('adds an empty late-dailies list and a cutoff from the highest date seen, and changes nothing else', () => {
    const out = v4_to_v5(structuredClone(v4) as Record<string, unknown>) as Record<string, any>;
    expect(out.progress.lateDailies).toEqual([]);
    const newest = Object.values(v4.progress.solved as Record<string, { date: string }>)
      .map((r) => r.date)
      .concat(v4.daily.highestDateSeen ?? [])
      .sort()
      .pop();
    expect(out.progress.legacyDailyCutoff).toBe(newest);
    const { lateDailies: _l, legacyDailyCutoff: _c, ...rest } = out.progress;
    expect(rest).toEqual(v4.progress);
    expect(out.daily).toEqual(v4.daily);
    expect(out.awards).toEqual(v4.awards);
    expect(out.hints).toEqual(v4.hints);
  });

  it('copes with a bare save', () => {
    expect(v4_to_v5({ schemaVersion: 4 })).toMatchObject({ progress: { lateDailies: [], legacyDailyCutoff: null } });
  });
});
