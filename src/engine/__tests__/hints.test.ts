import {
  addPurchasedHints,
  emptyHints,
  freeHintsLeft,
  hintsAvailable,
  mergeHints,
  onRewardedAdEvent,
  rewardedHintsLeft,
  spendHint,
} from '../hints';

const D1 = '2027-01-04';
const D2 = '2027-01-05';

describe('hints (F7)', () => {
  it('gives 2 free hints per local day, resetting at midnight', () => {
    let h = emptyHints();
    expect(hintsAvailable(h, D1)).toBe(2);
    h = spendHint(h, D1)!.state;
    h = spendHint(h, D1)!.state;
    expect(freeHintsLeft(h, D1)).toBe(0);
    expect(spendHint(h, D1)).toBeNull();
    expect(freeHintsLeft(h, D2)).toBe(2);
  });

  it('spends the free allowance before the balance', () => {
    let h = addPurchasedHints(emptyHints(), 15);
    const a = spendHint(h, D1)!;
    expect(a.source).toBe('free');
    h = spendHint(a.state, D1)!.state;
    const c = spendHint(h, D1)!;
    expect(c.source).toBe('balance');
    expect(c.state.balance).toBe(14);
  });

  it('grants a rewarded hint only on EARNED_REWARD', () => {
    const h = emptyHints();
    for (const e of ['LOADED', 'OPENED', 'CLOSED', 'ERROR'] as const) expect(onRewardedAdEvent(h, D1, e)).toBe(h);
    expect(onRewardedAdEvent(h, D1, 'EARNED_REWARD').balance).toBe(1);
  });

  it('caps rewarded hints at 5 per day', () => {
    let h = emptyHints();
    for (let i = 0; i < 8; i++) h = onRewardedAdEvent(h, D1, 'EARNED_REWARD');
    expect(h.balance).toBe(5);
    expect(rewardedHintsLeft(h, D1)).toBe(0);
    expect(rewardedHintsLeft(h, D2)).toBe(5);
    expect(onRewardedAdEvent(h, D2, 'EARNED_REWARD').balance).toBe(6);
  });

  it('rejects invalid purchase amounts', () => {
    expect(() => addPurchasedHints(emptyHints(), 0)).toThrow();
    expect(() => addPurchasedHints(emptyHints(), 1.5)).toThrow();
  });

  it('merges with the cloud without ever losing hints', () => {
    const local = { balance: 12, freeUsedDate: D1, freeUsedCount: 2, rewardedDate: D1, rewardedCount: 1 };
    const cloud = { balance: 50, freeUsedDate: D1, freeUsedCount: 1, rewardedDate: D2, rewardedCount: 3 };
    expect(mergeHints(local, cloud)).toEqual({
      balance: 50,
      freeUsedDate: D1,
      freeUsedCount: 2,
      rewardedDate: D2,
      rewardedCount: 3,
    });
    expect(mergeHints(cloud, local)).toEqual(mergeHints(local, cloud));
  });
});
