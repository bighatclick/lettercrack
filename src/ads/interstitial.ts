import { adsEnabled, type Features, features as defaultFeatures } from '@/config/features';
import type { Root } from '@/data/schema';
import { lifetimeSolves } from '@/game/session';

import { shouldShowInterstitial } from './policy';

type Deps = { features?: Features; adLoaded?: boolean; now?: number };

/**
 * Called only when the player taps Next on the solved screen. Returns whether an ad should show.
 * With the ads switch off (config/features.json) this returns false before anything else runs.
 * Phase 5 plugs in AdMob here (load state, show, afterInterstitialShown()). Until then no ad is
 * ever loaded. Whatever happens, the caller continues to the next puzzle.
 */
export async function maybeShowInterstitial(root: Root, mode: 'daily' | 'level', deps: Deps = {}): Promise<boolean> {
  if (!adsEnabled(deps.features ?? defaultFeatures)) return false;
  const decision = shouldShowInterstitial({
    trigger: 'solvedNext',
    mode,
    lifetimeSolves: lifetimeSolves(root),
    solvesSinceInterstitial: root.meta.solvesSinceInterstitial,
    lastInterstitialAt: root.meta.lastInterstitialAt,
    now: deps.now ?? Date.now(),
    removeAds: root.unlocks.removeAds,
    adOnScreen: false,
    adLoaded: deps.adLoaded ?? false,
  });
  return decision.show;
}
