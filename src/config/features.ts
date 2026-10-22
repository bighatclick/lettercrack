/**
 * Monetisation switches. The single source of truth is config/features.json.
 *
 * - ads: AdMob interstitials after Next, opt-in rewarded hints, UMP consent and the ATT prompt.
 * - payments: in-app purchases (Remove Ads, hint packs, quote packs), the Shop and Restore Purchases.
 *
 * Both start OFF: the first release ships with no ads and no payments. When a switch is off,
 * nothing related runs: no SDK calls, no prompts, no shop entry points. Play is never affected.
 * Turning one on needs a new native build (the SDKs and their config plugins are added in Phase 5).
 *
 * NOTE WHEN TURNING ADS OR PAYMENTS ON: the free hint allowance drops automatically from
 * FREE_HINTS_NO_MONETISATION (5/day) to the spec's 2/day (engine/hints.ts FREE_HINTS_PER_DAY).
 * Existing players will notice. Decide whether that is wanted, and tell players in the release
 * notes or in-app (e.g. "Free hints are now 2 a day; watch an ad or get a pack for more").
 */
import raw from '../../config/features.json';

import { FREE_HINTS_PER_DAY } from '@/engine/hints';

export type Features = { ads: boolean; payments: boolean };

export const features: Readonly<Features> = Object.freeze({ ads: raw.ads === true, payments: raw.payments === true });

export const adsEnabled = (f: Features = features) => f.ads;
export const paymentsEnabled = (f: Features = features) => f.payments;

/** Free hints per day while there is no way to earn or buy more. */
export const FREE_HINTS_NO_MONETISATION = 5;

/**
 * Free hints per local day. With ads and payments both off there is no other source of hints,
 * so the allowance is more generous. See the NOTE above before turning a switch on.
 */
export function freeHintsPerDay(f: Features = features): number {
  return f.ads || f.payments ? FREE_HINTS_PER_DAY : FREE_HINTS_NO_MONETISATION;
}
