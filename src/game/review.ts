import type { Root } from '@/data/schema';

const DAY = 86_400_000;
const YEAR = 365 * DAY;

/**
 * F8: ask for a review after the 3rd hint-free solve, at least 2 days after install,
 * at most 3 times in any 365 days (and 30 days apart), never right after an ad.
 * `cleanSolve`: the solve that just happened used no hints.
 */
export function shouldAskForReview(
  root: Root,
  now: number,
  opts: { cleanSolve: boolean; justShowedAd: boolean },
): boolean {
  if (!opts.cleanSolve || opts.justShowedAd) return false;
  if (now - root.installedAt < 2 * DAY) return false;
  const hintFree = Object.values(root.progress.solved).filter((r) => r.clean).length;
  if (hintFree < 3) return false;
  const past = root.meta.reviewPromptAt.filter((t) => t <= now);
  if (past.filter((t) => now - t < YEAR).length >= 3) return false;
  const last = Math.max(0, ...past);
  return now - last >= 30 * DAY;
}

export const noteReviewAsked = (root: Root, now: number): Root => ({
  ...root,
  meta: { ...root.meta, reviewPromptAt: [...root.meta.reviewPromptAt.filter((t) => now - t < YEAR), now] },
});
