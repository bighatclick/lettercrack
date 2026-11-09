import { act, render } from '@testing-library/react-native';
import { Dimensions, type ScaledSize } from 'react-native';

import { cacheBustingMultiplier, FONT_NUDGE, NUDGE_STEPS, relayoutProps, SETTLE_MS, useRelayoutEpoch } from '../relayout';

// D31: text is measured again once the window size settles (a tablet rotation), never mid-rotation.
describe('relayout epoch', () => {
  let emit: ((e: { window: ScaledSize; screen: ScaledSize }) => void) | undefined;
  const size = (width: number, height: number): ScaledSize => ({ width, height, scale: 2, fontScale: 1 });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Dimensions, 'get').mockReturnValue(size(1280, 800));
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as typeof emit;
      return { remove: () => (emit = undefined) } as ReturnType<typeof Dimensions.addEventListener>;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function mountProbe() {
    const seen: number[] = [];
    function Probe() {
      seen.push(useRelayoutEpoch());
      return null;
    }
    const view = await render(<Probe />);
    expect(seen.length).toBeGreaterThan(0);
    return { seen, view, start: seen[seen.length - 1] ?? 0 };
  }

  const resize = (width: number, height: number) =>
    act(async () => {
      emit?.({ window: size(width, height), screen: size(width, height) });
    });
  const wait = (ms: number) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
    });

  it('goes up once, after the size stops changing', async () => {
    const { seen, view, start } = await mountProbe();
    // A rotation can report a few sizes in a row; only the last one counts.
    await resize(1000, 900);
    await wait(SETTLE_MS / 2);
    await resize(800, 1280);
    await wait(SETTLE_MS - 1);
    expect(seen[seen.length - 1]).toBe(start);
    await wait(1);
    expect(seen[seen.length - 1]).toBe(start + 1);
    await view.unmount();
  });

  it('ignores events that keep the same size', async () => {
    const { seen, view, start } = await mountProbe();
    await resize(1280, 800);
    await wait(SETTLE_MS * 2);
    expect(seen[seen.length - 1]).toBe(start);
    await view.unmount();
  });

  it('gives every epoch a new multiplier that never caps real text sizes', () => {
    expect(cacheBustingMultiplier(0)).toBeUndefined();
    const values = [1, 2, 3, 4, 5].map(cacheBustingMultiplier);
    expect(new Set(values).size).toBe(values.length);
    values.forEach((v) => expect(v).toBeGreaterThanOrEqual(1000));
  });

  it('changes the font size by an invisible amount on every epoch, never back to 0', () => {
    const nudges = Array.from({ length: 30 }, (_, i) => relayoutProps(i + 1).fontNudge);
    nudges.forEach((n, i) => {
      expect(n).toBeGreaterThan(0.005);
      expect(n).toBeLessThanOrEqual(FONT_NUDGE * NUDGE_STEPS);
      if (i > 0) expect(Math.abs(n - (nudges[i - 1] ?? 0))).toBeGreaterThan(0.005);
    });
    expect(FONT_NUDGE * NUDGE_STEPS).toBeLessThan(0.1);
    expect(relayoutProps(0).fontNudge).toBe(0);
    expect(relayoutProps(0).maxFontSizeMultiplier).toBeUndefined();
  });
});
