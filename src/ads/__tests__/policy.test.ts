import {
  AD_RULES,
  type AdCounters,
  afterInterstitialShown,
  afterSolve,
  canOfferRewarded,
  type InterstitialContext,
  shouldShowInterstitial,
} from '../policy';

const MIN = 60_000;
const T0 = 1_800_000_000_000;

const ok: InterstitialContext = {
  trigger: 'solvedNext',
  mode: 'level',
  lifetimeSolves: 10,
  solvesSinceInterstitial: 2,
  lastInterstitialAt: T0,
  now: T0 + 5 * MIN,
  removeAds: false,
  adOnScreen: false,
  adLoaded: true,
};
const decide = (over: Partial<InterstitialContext>) => shouldShowInterstitial({ ...ok, ...over });

describe('interstitial policy (hard rule 2)', () => {
  it('shows when every rule passes', () => {
    expect(decide({})).toEqual({ show: true });
  });

  it.each(['appOpen', 'appForeground', 'puzzleStart', 'midPuzzle', 'other'] as const)('never on %s', (trigger) => {
    expect(decide({ trigger })).toEqual({ show: false, reason: 'wrongTrigger' });
  });

  it('never with Remove Ads', () => expect(decide({ removeAds: true })).toMatchObject({ show: false, reason: 'removeAds' }));
  it('never after a daily', () => expect(decide({ mode: 'daily' })).toMatchObject({ show: false, reason: 'daily' }));

  it('never in the first 3 puzzles', () => {
    for (const n of [1, 2, 3]) expect(decide({ lifetimeSolves: n })).toMatchObject({ reason: 'firstPuzzles' });
    expect(decide({ lifetimeSolves: 4, lastInterstitialAt: null })).toEqual({ show: true });
  });

  it('at most 1 per 2 solves', () => {
    expect(decide({ solvesSinceInterstitial: 1 })).toMatchObject({ reason: 'tooFewSolves' });
  });

  it('at most 1 per 4 minutes', () => {
    expect(decide({ now: T0 + 4 * MIN - 1 })).toMatchObject({ reason: 'tooSoon' });
    expect(decide({ now: T0 + 4 * MIN })).toEqual({ show: true });
  });

  it('never stacked, and never without a loaded ad', () => {
    expect(decide({ adOnScreen: true })).toMatchObject({ reason: 'adOnScreen' });
    expect(decide({ adLoaded: false })).toMatchObject({ reason: 'notLoaded' });
  });

  it('falls back to the solve-count rule if the clock moved backwards', () => {
    expect(decide({ now: T0 - 60 * MIN })).toEqual({ show: true });
    expect(decide({ now: T0 - 60 * MIN, solvesSinceInterstitial: 1 })).toMatchObject({ reason: 'tooFewSolves' });
  });

  it('simulated session: fast solver sees at most 1 ad per 2 solves and 4 minutes, none early', () => {
    let c: AdCounters = { solvesSinceInterstitial: 0, lastInterstitialAt: null };
    const shownAt: { solve: number; t: number }[] = [];
    let t = T0;
    for (let solve = 1; solve <= 60; solve++) {
      t += 90_000; // a solve every 90 s
      c = afterSolve(c);
      const mode = solve % 7 === 0 ? 'daily' : 'level';
      const d = shouldShowInterstitial({ ...ok, ...c, mode, lifetimeSolves: solve, now: t });
      if (d.show) {
        shownAt.push({ solve, t });
        c = afterInterstitialShown(c, t);
      }
    }
    expect(shownAt.length).toBeGreaterThan(0);
    expect(shownAt[0]!.solve).toBeGreaterThan(AD_RULES.freePuzzles);
    for (let i = 1; i < shownAt.length; i++) {
      expect(shownAt[i]!.solve - shownAt[i - 1]!.solve).toBeGreaterThanOrEqual(2);
      expect(shownAt[i]!.t - shownAt[i - 1]!.t).toBeGreaterThanOrEqual(AD_RULES.minMsBetween);
      expect(shownAt[i]!.solve % 7).not.toBe(0);
    }
  });
});

describe('rewarded', () => {
  it('is offered only under the daily cap, when loaded and nothing else is showing', () => {
    expect(canOfferRewarded({ rewardedLeftToday: 1, adOnScreen: false, adLoaded: true })).toBe(true);
    expect(canOfferRewarded({ rewardedLeftToday: 0, adOnScreen: false, adLoaded: true })).toBe(false);
    expect(canOfferRewarded({ rewardedLeftToday: 3, adOnScreen: true, adLoaded: true })).toBe(false);
    expect(canOfferRewarded({ rewardedLeftToday: 3, adOnScreen: false, adLoaded: false })).toBe(false);
  });
});
