import v3 from '../__fixtures__/v3.json';
import { v3_to_v4 } from '../v3_to_v4';

describe('v3 → v4', () => {
  it('adds empty awards and the default outfit, and changes nothing else', () => {
    const out = v3_to_v4(structuredClone(v3) as Record<string, unknown>);
    expect(out.awards).toEqual({ earned: {}, seen: [] });
    expect(out.outfit).toEqual({ hat: null, face: 'monocle', neck: null, bg: null });
    expect(out.progress).toEqual(v3.progress);
    expect(out.daily).toEqual(v3.daily);
    expect(out.goals).toEqual(v3.goals);
    expect(out.hints).toEqual(v3.hints);
    expect(out.meta).toEqual(v3.meta);
  });

  it('copes with a bare save', () => {
    expect(v3_to_v4({ schemaVersion: 3 })).toMatchObject({ awards: { earned: {}, seen: [] } });
  });
});
