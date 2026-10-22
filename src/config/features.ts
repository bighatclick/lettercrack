/**
 * Monetisation switches. The single source of truth is config/features.json.
 *
 * - ads: AdMob interstitials after Next, opt-in rewarded hints, UMP consent and the ATT prompt.
 * - payments: in-app purchases (Remove Ads, hint packs, quote packs), the Shop and Restore Purchases.
 *
 * Both start OFF: the first release ships with no ads and no payments. When a switch is off,
 * nothing related runs: no SDK calls, no prompts, no shop entry points. Play is never affected.
 * Turning one on needs a new native build (the SDKs and their config plugins are added in Phase 5).
 */
import raw from '../../config/features.json';

export type Features = { ads: boolean; payments: boolean };

export const features: Readonly<Features> = Object.freeze({ ads: raw.ads === true, payments: raw.payments === true });

export const adsEnabled = (f: Features = features) => f.ads;
export const paymentsEnabled = (f: Features = features) => f.payments;
