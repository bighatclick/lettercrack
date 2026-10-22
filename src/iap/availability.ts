import { type Features, features as defaultFeatures, paymentsEnabled } from '@/config/features';

/**
 * Every payment entry point asks here first: the Shop, Remove Ads, hint packs, quote packs and
 * Restore Purchases. While the payments switch is off (config/features.json) none of them is shown
 * and no StoreKit / Play Billing call is made.
 */
export const shopAvailable = (f: Features = defaultFeatures) => paymentsEnabled(f);
export const restorePurchasesAvailable = (f: Features = defaultFeatures) => paymentsEnabled(f);
