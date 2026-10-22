/**
 * ALL interstitial timing lives here (CLAUDE.md hard rule 2). Pure and unit-tested.
 *
 * An interstitial may show only when every rule passes:
 * - the trigger is the player tapping Next on the solved screen (never app open, never mid-puzzle);
 * - Remove Ads is not owned;
 * - the solved puzzle is not a daily;
 * - the player has solved more than 3 puzzles in total (none in the first 3);
 * - at least 2 solves since the last interstitial;
 * - at least 4 minutes since the last interstitial;
 * - no other ad is on screen (never stacked) and one is loaded.
 * Ad failures never block play: callers proceed to the next puzzle whatever happens.
 */

export const AD_RULES = {
  freePuzzles: 3,
  minSolvesBetween: 2,
  minMsBetween: 4 * 60_000,
} as const;

export type AdTrigger = 'solvedNext' | 'appOpen' | 'appForeground' | 'puzzleStart' | 'midPuzzle' | 'other';

export type InterstitialContext = {
  trigger: AdTrigger;
  /** Mode of the puzzle just solved. */
  mode: 'daily' | 'level';
  /** Lifetime solves, including the one just completed. */
  lifetimeSolves: number;
  /** Solves since the last interstitial, including the one just completed. */
  solvesSinceInterstitial: number;
  lastInterstitialAt: number | null;
  now: number;
  removeAds: boolean;
  adOnScreen: boolean;
  adLoaded: boolean;
};

export type BlockReason =
  | 'wrongTrigger'
  | 'removeAds'
  | 'daily'
  | 'firstPuzzles'
  | 'tooFewSolves'
  | 'tooSoon'
  | 'adOnScreen'
  | 'notLoaded';

export type InterstitialDecision = { show: true } | { show: false; reason: BlockReason };

export function shouldShowInterstitial(c: InterstitialContext): InterstitialDecision {
  const no = (reason: BlockReason): InterstitialDecision => ({ show: false, reason });
  if (c.trigger !== 'solvedNext') return no('wrongTrigger');
  if (c.removeAds) return no('removeAds');
  if (c.mode === 'daily') return no('daily');
  if (c.lifetimeSolves <= AD_RULES.freePuzzles) return no('firstPuzzles');
  if (c.solvesSinceInterstitial < AD_RULES.minSolvesBetween) return no('tooFewSolves');
  if (c.lastInterstitialAt !== null) {
    const elapsed = c.now - c.lastInterstitialAt;
    // A negative elapsed time means the clock moved back; the solve-count rule still applies.
    if (elapsed >= 0 && elapsed < AD_RULES.minMsBetween) return no('tooSoon');
  }
  if (c.adOnScreen) return no('adOnScreen');
  if (!c.adLoaded) return no('notLoaded');
  return { show: true };
}

export type AdCounters = { solvesSinceInterstitial: number; lastInterstitialAt: number | null };

export const afterSolve = (c: AdCounters): AdCounters => ({ ...c, solvesSinceInterstitial: c.solvesSinceInterstitial + 1 });

/** Call only when the interstitial actually showed. */
export const afterInterstitialShown = (c: AdCounters, now: number): AdCounters => ({
  solvesSinceInterstitial: 0,
  lastInterstitialAt: now,
});

/** Rewarded ads are opt-in for +1 hint, available even with Remove Ads; the daily cap lives in engine/hints.ts. */
export function canOfferRewarded(args: { rewardedLeftToday: number; adOnScreen: boolean; adLoaded: boolean }): boolean {
  return args.rewardedLeftToday > 0 && !args.adOnScreen && args.adLoaded;
}
