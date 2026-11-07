import v1 from '../__fixtures__/v1.json';
import { v1_to_v2 } from '../v1_to_v2';

describe('v1 → v2', () => {
  it('marks players with history as onboarded at install time', () => {
    const out = v1_to_v2(structuredClone(v1) as Record<string, unknown>);
    expect((out.meta as Record<string, unknown>).onboardedAt).toBe(v1.installedAt);
    expect((out.meta as Record<string, unknown>).settingsUpdatedAt).toBe(0);
    // Nothing else changes.
    expect(out.progress).toEqual(v1.progress);
    expect(out.daily).toEqual(v1.daily);
    expect(out.hints).toEqual(v1.hints);
  });

  it('leaves a brand-new save un-onboarded', () => {
    const fresh = { schemaVersion: 1, installedAt: 5, progress: { seenQuoteIds: [], solved: {} }, inProgress: {}, meta: {} };
    expect((v1_to_v2(fresh).meta as Record<string, unknown>).onboardedAt).toBeNull();
  });
});
