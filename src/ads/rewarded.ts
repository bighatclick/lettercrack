import { adsEnabled, type Features, features as defaultFeatures } from '@/config/features';
import type { LocalDate } from '@/engine/daily';
import { rewardedHintsLeft } from '@/engine/hints';
import type { Root } from '@/data/schema';

import { canOfferRewarded } from './policy';

/**
 * Whether to offer "Watch an ad for +1 hint" when the player is out of hints.
 * Always false while the ads switch is off; the hint bar then only says free hints refill at midnight.
 */
export function shouldOfferRewardedHint(
  root: Root,
  today: LocalDate,
  deps: { features?: Features; adLoaded?: boolean } = {},
): boolean {
  if (!adsEnabled(deps.features ?? defaultFeatures)) return false;
  return canOfferRewarded({
    rewardedLeftToday: rewardedHintsLeft(root.hints, today),
    adOnScreen: false,
    adLoaded: deps.adLoaded ?? false,
  });
}
