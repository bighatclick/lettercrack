import type { Root } from '@/data/schema';
import { lifetimeSolves } from '@/game/session';

import { shouldShowInterstitial } from './policy';

/**
 * Called only when the player taps Next on the solved screen. Phase 5 plugs in AdMob here:
 * load state, show, and afterInterstitialShown(). Until then no ad is ever loaded, so this
 * always resolves false. Whatever happens, the caller continues to the next puzzle.
 */
export async function maybeShowInterstitial(root: Root, mode: 'daily' | 'level'): Promise<boolean> {
  const decision = shouldShowInterstitial({
    trigger: 'solvedNext',
    mode,
    lifetimeSolves: lifetimeSolves(root),
    solvesSinceInterstitial: root.meta.solvesSinceInterstitial,
    lastInterstitialAt: root.meta.lastInterstitialAt,
    now: Date.now(),
    removeAds: root.unlocks.removeAds,
    adOnScreen: false,
    adLoaded: false,
  });
  return decision.show;
}
