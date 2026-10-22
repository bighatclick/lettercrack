/**
 * Glue between the pure engine, the persisted Root and the quote content.
 * Pure functions (Root in, Root out) so the screens stay thin and everything here is unit-tested.
 */
import type { Content } from '@/content/quotes';
import type { PuzzleSave, Root } from '@/data/schema';
import { afterSolve } from '@/ads/policy';
import { dailySeed, levelSeed } from '@/engine/cipher';
import { dailyQuoteId, isPlayableDaily, type LocalDate, noteSeenDate } from '@/engine/daily';
import { hintsAvailable, spendHint } from '@/engine/hints';
import { markSeen, pickNextQuote } from '@/engine/picker';
import {
  createPuzzle,
  type Difficulty,
  isClean,
  type PuzzleInit,
  type PuzzleState,
  restorePuzzle,
  snapshot,
} from '@/engine/puzzle';
import { recordDailySolve, type SolveResult } from '@/engine/streak';

export type PuzzleRef = {
  key: string;
  mode: 'daily' | 'level';
  quoteId: number;
  dailyDate: LocalDate | null;
};

export const dailyKey = (date: LocalDate) => `daily:${date}`;
export const levelKey = (quoteId: number) => `level:${quoteId}`;

/** Parses a route param back into a ref. Returns null for anything unknown or unplayable. */
export function refFromKey(key: string, content: Content, today: LocalDate): PuzzleRef | null {
  const daily = /^daily:(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (daily) return dailyRef(daily[1] as string, content, today);
  const level = /^level:(\d+)$/.exec(key);
  if (level) {
    const id = Number(level[1]);
    return content.quote(id) ? { key, mode: 'level', quoteId: id, dailyDate: null } : null;
  }
  return null;
}

export function dailyRef(date: LocalDate, content: Content, today: LocalDate): PuzzleRef | null {
  if (!isPlayableDaily(date, today) && date !== today) return null;
  return { key: dailyKey(date), mode: 'daily', quoteId: dailyQuoteId(date, content.dailyOrder), dailyDate: date };
}

/** Resumes the most recent unfinished level, or picks the next unseen quote (rule 6). */
export function nextLevelRef(root: Root, content: Content, difficulty: Difficulty): PuzzleRef | null {
  const open = Object.entries(root.inProgress)
    .filter(([, s]) => s.mode === 'level' && content.quote(s.quoteId))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  if (open) return { key: open[0], mode: 'level', quoteId: open[1].quoteId, dailyDate: null };
  const id = pickNextQuote({
    pool: content.levelPool,
    seen: root.progress.seenQuoteIds,
    exclude: new Set(root.progress.reportedQuoteIds),
    difficulty,
  });
  return id === null ? null : { key: levelKey(id), mode: 'level', quoteId: id, dailyDate: null };
}

export function puzzleInit(ref: PuzzleRef, content: Content, difficulty: Difficulty, autoFill: boolean): PuzzleInit {
  const q = content.quote(ref.quoteId);
  if (!q) throw new Error(`unknown quote ${ref.quoteId}`);
  const seed = ref.mode === 'daily' ? dailySeed(ref.dailyDate as string) : levelSeed(ref.quoteId);
  return { text: q.text, seed, difficulty, autoFill };
}

export type OpenedPuzzle = { root: Root; state: PuzzleState; difficulty: Difficulty };

/** Opens a puzzle: restores the save if there is one, else starts fresh and marks the quote seen. */
export function openPuzzle(root: Root, ref: PuzzleRef, content: Content, difficultyOverride?: Difficulty): OpenedPuzzle {
  const save = root.inProgress[ref.key];
  const autoFill = root.settings.autoFill;
  if (save && !difficultyOverride) {
    const state = restorePuzzle(puzzleInit(ref, content, save.difficulty, autoFill), save);
    return { root, state, difficulty: save.difficulty };
  }
  const difficulty = difficultyOverride ?? root.settings.defaultDifficulty;
  const state = createPuzzle(puzzleInit(ref, content, difficulty, autoFill));
  const seen = root.progress.seenQuoteIds.includes(ref.quoteId)
    ? root.progress.seenQuoteIds
    : markSeen(root.progress.seenQuoteIds, ref.quoteId);
  const inProgress = { ...root.inProgress };
  delete inProgress[ref.key];
  return { root: { ...root, inProgress, progress: { ...root.progress, seenQuoteIds: seen } }, state, difficulty };
}

/** Autosave after every key (F4). */
export function saveProgress(root: Root, ref: PuzzleRef, difficulty: Difficulty, state: PuzzleState, now: number): Root {
  if (state.solved) return root;
  const save: PuzzleSave = {
    ...snapshot(state),
    quoteId: ref.quoteId,
    mode: ref.mode,
    dailyDate: ref.dailyDate,
    difficulty,
    updatedAt: now,
  };
  return { ...root, inProgress: { ...root.inProgress, [ref.key]: save } };
}

export type Completion = { root: Root; streak: SolveResult | null; clean: boolean };

export function completePuzzle(
  root: Root,
  ref: PuzzleRef,
  difficulty: Difficulty,
  state: PuzzleState,
  today: LocalDate,
): Completion {
  if (!state.solved) throw new Error('completePuzzle called on an unsolved puzzle');
  const clean = isClean(state);
  const inProgress = { ...root.inProgress };
  delete inProgress[ref.key];
  const progress = {
    ...root.progress,
    levelIndex: ref.mode === 'level' ? root.progress.levelIndex + 1 : root.progress.levelIndex,
    seenQuoteIds: markSeen(root.progress.seenQuoteIds, ref.quoteId),
    solved: {
      ...root.progress.solved,
      [ref.quoteId]: { date: today, clean, timeMs: root.settings.showTimer ? state.elapsedMs : null, difficulty },
    },
  };
  let daily = root.daily;
  let streak: SolveResult | null = null;
  if (ref.mode === 'daily' && ref.dailyDate) {
    streak = recordDailySolve(root.daily, ref.dailyDate, today);
    daily = streak.state;
  }
  const ad = afterSolve(root.meta);
  return {
    root: { ...root, progress, daily, inProgress, meta: { ...root.meta, solvesSinceInterstitial: ad.solvesSinceInterstitial } },
    streak,
    clean,
  };
}

export const hintsLeft = (root: Root, today: LocalDate) => hintsAvailable(root.hints, today);

/** Spends one hint (free first). Null when none are left; the UI then offers the rewarded ad (Phase 5). */
export function consumeHint(root: Root, today: LocalDate): Root | null {
  const r = spendHint(root.hints, today);
  return r ? { ...root, hints: r.state } : null;
}

/** On every launch / foreground: remember the highest date seen (rewound-clock guard). */
export function onAppOpen(root: Root, today: LocalDate): Root {
  const highestDateSeen = noteSeenDate(root.daily.highestDateSeen, today);
  return highestDateSeen === root.daily.highestDateSeen ? root : { ...root, daily: { ...root.daily, highestDateSeen } };
}

export const lifetimeSolves = (root: Root) => Object.keys(root.progress.solved).length;
