import { maybeShowInterstitial } from '@/ads/interstitial';
import { shouldOfferRewardedHint } from '@/ads/rewarded';
import { defaultRoot, type Root } from '@/data/schema';
import { restorePurchasesAvailable, shopAvailable } from '@/iap/availability';

import { FREE_HINTS_PER_DAY } from '@/engine/hints';

import { features, FREE_HINTS_NO_MONETISATION, freeHintsPerDay } from '../features';

const NOW = 1_800_000_000_000;
const TODAY = '2027-01-10';
const ON = { ads: true, payments: true };
const OFF = { ads: false, payments: false };

/** A save where every interstitial rule would pass. */
function adReadyRoot(): Root {
  const r = defaultRoot(NOW);
  const solved = Object.fromEntries(
    [1, 2, 3, 4, 5].map((id) => [id, { date: TODAY, clean: true, timeMs: null, difficulty: 'easy' as const }]),
  );
  return { ...r, progress: { ...r.progress, solved }, meta: { ...r.meta, solvesSinceInterstitial: 2, lastInterstitialAt: null } };
}

describe('monetisation switches', () => {
  it('ships with ads and payments switched off', () => {
    // Deliberate guard: flip config/features.json AND this expectation together when going live.
    // Remember: turning either on drops free hints from 5/day to 2/day (see src/config/features.ts).
    expect(features).toEqual(OFF);
    expect(freeHintsPerDay()).toBe(FREE_HINTS_NO_MONETISATION);
  });

  it('gives 5 free hints a day with no ads or payments, and the spec 2 once either is on', () => {
    expect(freeHintsPerDay(OFF)).toBe(5);
    expect(freeHintsPerDay(ON)).toBe(FREE_HINTS_PER_DAY);
    expect(freeHintsPerDay({ ads: true, payments: false })).toBe(2);
    expect(freeHintsPerDay({ ads: false, payments: true })).toBe(2);
  });

  it('ads off: no interstitial even when every rule passes and an ad is loaded', async () => {
    await expect(maybeShowInterstitial(adReadyRoot(), 'level', { features: OFF, adLoaded: true, now: NOW })).resolves.toBe(false);
    await expect(maybeShowInterstitial(adReadyRoot(), 'level', { features: ON, adLoaded: true, now: NOW })).resolves.toBe(true);
  });

  it('ads off: no rewarded hint offer', () => {
    expect(shouldOfferRewardedHint(adReadyRoot(), TODAY, { features: OFF, adLoaded: true })).toBe(false);
    expect(shouldOfferRewardedHint(adReadyRoot(), TODAY, { features: ON, adLoaded: true })).toBe(true);
  });

  it('payments off: no shop and no restore', () => {
    expect(shopAvailable(OFF)).toBe(false);
    expect(restorePurchasesAvailable(OFF)).toBe(false);
    expect(shopAvailable(ON)).toBe(true);
  });

  it('defaults follow config/features.json', async () => {
    await expect(maybeShowInterstitial(adReadyRoot(), 'level', { adLoaded: true, now: NOW })).resolves.toBe(features.ads);
    expect(shopAvailable()).toBe(features.payments);
  });
});
