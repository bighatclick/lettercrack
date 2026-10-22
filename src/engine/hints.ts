import type { LocalDate } from './daily';

/**
 * Hint economy (specs.md §5, F7): 2 free hints per local day, then the paid/rewarded balance.
 * Rewarded ads grant +1 only on EARNED_REWARD, at most 5 per day. No coins, no expiry.
 */
export type HintsState = {
  balance: number;
  freeUsedDate: LocalDate | null;
  freeUsedCount: number;
  rewardedDate: LocalDate | null;
  rewardedCount: number;
};

export const FREE_HINTS_PER_DAY = 2;
export const REWARDED_HINTS_PER_DAY = 5;

export const emptyHints = (): HintsState => ({
  balance: 0,
  freeUsedDate: null,
  freeUsedCount: 0,
  rewardedDate: null,
  rewardedCount: 0,
});

export function freeHintsLeft(h: HintsState, today: LocalDate): number {
  return h.freeUsedDate === today ? Math.max(0, FREE_HINTS_PER_DAY - h.freeUsedCount) : FREE_HINTS_PER_DAY;
}

export const hintsAvailable = (h: HintsState, today: LocalDate) => freeHintsLeft(h, today) + h.balance;

/** Spends one hint, free allowance first. Returns null when none are left. */
export function spendHint(h: HintsState, today: LocalDate): { state: HintsState; source: 'free' | 'balance' } | null {
  if (freeHintsLeft(h, today) > 0) {
    const used = h.freeUsedDate === today ? h.freeUsedCount : 0;
    return { state: { ...h, freeUsedDate: today, freeUsedCount: used + 1 }, source: 'free' };
  }
  if (h.balance > 0) return { state: { ...h, balance: h.balance - 1 }, source: 'balance' };
  return null;
}

export function rewardedHintsLeft(h: HintsState, today: LocalDate): number {
  return h.rewardedDate === today ? Math.max(0, REWARDED_HINTS_PER_DAY - h.rewardedCount) : REWARDED_HINTS_PER_DAY;
}

export type RewardedAdEvent = 'LOADED' | 'OPENED' | 'EARNED_REWARD' | 'CLOSED' | 'ERROR';

/** Only EARNED_REWARD grants a hint, and only under the daily cap. */
export function onRewardedAdEvent(h: HintsState, today: LocalDate, event: RewardedAdEvent): HintsState {
  if (event !== 'EARNED_REWARD' || rewardedHintsLeft(h, today) === 0) return h;
  const count = h.rewardedDate === today ? h.rewardedCount : 0;
  return { ...h, balance: h.balance + 1, rewardedDate: today, rewardedCount: count + 1 };
}

export function addPurchasedHints(h: HintsState, amount: number): HintsState {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`invalid hint amount ${amount}`);
  return { ...h, balance: h.balance + amount };
}

/**
 * iCloud merge (CLAUDE.md rule 3): balance = max(local, cloud) so purchased hints are never lost.
 * Day counters keep the later day; on the same day, the higher count.
 */
export function mergeHints(local: HintsState, cloud: HintsState): HintsState {
  const pick = (a: [LocalDate | null, number], b: [LocalDate | null, number]): [LocalDate | null, number] => {
    if (a[0] === b[0]) return [a[0], Math.max(a[1], b[1])];
    return (a[0] ?? '') > (b[0] ?? '') ? a : b;
  };
  const [freeUsedDate, freeUsedCount] = pick([local.freeUsedDate, local.freeUsedCount], [cloud.freeUsedDate, cloud.freeUsedCount]);
  const [rewardedDate, rewardedCount] = pick([local.rewardedDate, local.rewardedCount], [cloud.rewardedDate, cloud.rewardedCount]);
  return { balance: Math.max(local.balance, cloud.balance), freeUsedDate, freeUsedCount, rewardedDate, rewardedCount };
}
