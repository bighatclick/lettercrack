import { useSyncExternalStore } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';

/**
 * D31: after a tablet rotates, Android draws text slightly wider (about 1.5%) than before, but
 * React Native's text measure cache still returns the width it measured before the rotation. A
 * label that fitted exactly then wraps inside a box sized for one line, and the second line is
 * hidden ("TODAY'S QUOTE" shows as "TODAY'S"). Remounting doesn't help, because the cache is keyed
 * on the text and its style, not on the view. So once the window size has stopped changing for
 * SETTLE_MS, this epoch goes up and Text changes two props (see relayoutProps):
 * - maxFontSizeMultiplier gets a value it has never had. It is part of the cache key, so the
 *   cache misses; at 1000+ it is far above any OS text size, so it never changes the text size.
 * - fontSize grows by a tiny, invisible amount that changes every epoch and never returns to 0.
 *   Without it, layout reuses the old width and the label wraps onto two lines instead of
 *   growing; and going back to the original size picked up the stale width again.
 */
export const SETTLE_MS = 500;

let epoch = 0;
let last: { width: number; height: number } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let removeListener: (() => void) | undefined;
const subscribers = new Set<() => void>();

function onChange({ window }: { window: ScaledSize }) {
  if (last && window.width === last.width && window.height === last.height) return;
  last = { width: window.width, height: window.height };
  clearTimeout(timer);
  timer = setTimeout(() => {
    epoch += 1;
    subscribers.forEach((notify) => notify());
  }, SETTLE_MS);
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (!removeListener) {
    const { width, height } = Dimensions.get('window');
    last = { width, height };
    const subscription = Dimensions.addEventListener('change', onChange);
    removeListener = () => subscription.remove();
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      removeListener?.();
      removeListener = undefined;
      clearTimeout(timer);
    }
  };
}

const getEpoch = () => epoch;

/** Goes up once the window size has settled after a change (rotation, split screen, resize). */
export function useRelayoutEpoch(): number {
  return useSyncExternalStore(subscribe, getEpoch, getEpoch);
}

/** One nudge step: above the measure cache's float tolerance (0.005). */
export const FONT_NUDGE = 0.006;
/** Nudges cycle through this many steps, so the largest is 0.06 pt: far below anything visible. */
export const NUDGE_STEPS = 10;

/** The props Text applies for an epoch. Both are absent before the first size change. */
export function relayoutProps(epoch: number): { maxFontSizeMultiplier?: number; fontNudge: number } {
  return {
    maxFontSizeMultiplier: cacheBustingMultiplier(epoch),
    fontNudge: epoch === 0 ? 0 : FONT_NUDGE * (1 + ((epoch - 1) % NUDGE_STEPS)),
  };
}

/**
 * A maxFontSizeMultiplier that is new for every epoch (so it never matches a cached measurement)
 * and too large to cap any real OS text size. Undefined before the first size change.
 */
export function cacheBustingMultiplier(epoch: number): number | undefined {
  return epoch === 0 ? undefined : 1000 + epoch;
}
