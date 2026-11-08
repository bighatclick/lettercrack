import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { type Content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import {
  type Difficulty,
  hasPlayerEntries,
  isFilled,
  type PuzzleAction,
  puzzleReducer,
  type PuzzleState,
  usedLetters,
} from '@/engine/puzzle';
import type { GoalsResult } from '@/engine/goals';
import type { SolveResult } from '@/engine/streak';
import { playSound } from '@/lib/sound';

import { collectedAuthors, currentAwardKeys, refreshAwards } from './awards';
import { cellFlags } from './flags';
import { completePuzzle, consumeHint, hintsLeft, openPuzzle, type PuzzleRef, saveProgress } from './session';
import { today } from './today';
import { useToday } from './useNow';

export type Completion = {
  clean: boolean;
  streak: SolveResult | null;
  goals: GoalsResult | null;
  /** First quote by this author (a replay never counts). */
  newAuthor: boolean;
  /** Wardrobe items unlocked by this solve only (not older ones still unseen). */
  newItems: string[];
};

const tap = (on: boolean) => {
  if (on) Haptics.selectionAsync().catch(() => {});
};

/**
 * Runs one puzzle. Every transition goes through `apply`, called from event handlers:
 * it updates the board, autosaves (F4), and records the solve exactly once, then calls `onSolved`.
 */
export function usePuzzleGame(ref: PuzzleRef, content: Content, onSolved: (c: Completion) => void) {
  const { t } = useTranslation();
  const update = useAppStore((s) => s.update);
  const settings = useAppStore((s) => s.root!.settings);
  const hints = useAppStore((s) => s.root!.hints);
  // Free hints reset at midnight: re-read them when the app comes back or the hour turns.
  const date = useToday();

  const [opened] = useState(() => openPuzzle(useAppStore.getState().root!, ref, content));
  const [state, setState] = useState<PuzzleState>(opened.state);
  const [difficulty, setDifficulty] = useState<Difficulty>(opened.difficulty);
  const [note, setNote] = useState<string | null>(null);

  // Latest values for handlers (never read during render).
  const live = useRef({ state: opened.state, difficulty: opened.difficulty, completed: opened.state.solved, onSolved });
  useEffect(() => {
    live.current.onSolved = onSolved;
  }, [onSolved]);

  // Persist the open (marks the quote seen). Deterministic, so re-applying to the live root is safe.
  useEffect(() => {
    update((r) => openPuzzle(r, ref, content).root);
  }, [update, ref, content]);

  const commit = useCallback(
    (next: PuzzleState) => {
      const l = live.current;
      l.state = next;
      setState(next);
      if (!next.solved) {
        update((r) => saveProgress(r, ref, l.difficulty, next, Date.now()));
        return;
      }
      if (l.completed) return;
      l.completed = true;
      let completion: Completion = { clean: false, streak: null, goals: null, newAuthor: false, newItems: [] };
      update((r) => {
        const day = today();
        const c = completePuzzle(r, ref, l.difficulty, next, day);
        // Badges (Phase B): lifetime ones plus this solve's moment (time of day, length, goals).
        const out = refreshAwards(c.root, content, day, {
          hour: new Date().getHours(),
          letters: next.plain.replace(/[^A-Z]/g, '').length,
          clean: c.clean,
          goalsDone: c.goals.rewardNow,
        }).root;
        const author = content.quote(ref.quoteId)?.author;
        const itemsBefore = new Set(currentAwardKeys(r, content).filter((k) => k.startsWith('item:')));
        completion = {
          clean: c.clean,
          streak: c.streak,
          goals: c.goals,
          newAuthor: !!author && !collectedAuthors(r, content).has(author),
          newItems: currentAwardKeys(out, content)
            .filter((k) => k.startsWith('item:') && !itemsBefore.has(k))
            .map((k) => k.slice(5)),
        };
        return out;
      });
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSound('rustle', settings.sound);
      l.onSolved(completion);
    },
    [ref, update, settings.haptics, settings.sound, content],
  );

  const apply = useCallback(
    (action: PuzzleAction): boolean => {
      const prev = live.current.state;
      const next = puzzleReducer(prev, action);
      if (next === prev) return false;
      commit(next);
      return true;
    },
    [commit],
  );

  // Elapsed time while the app is in the foreground (a stat only; never a countdown).
  useEffect(() => {
    if (state.solved) return;
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (s) => {
      active = s === 'active';
    });
    const id = setInterval(() => {
      if (active) apply({ type: 'elapsed', ms: 1000 });
    }, 1000);
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [state.solved, apply]);

  const keyId = useRef(0);
  const onSelect = useCallback((index: number) => apply({ type: 'select', index }), [apply]);
  const onLetter = useCallback(
    (letter: string) => {
      tap(settings.haptics);
      playSound('tick', settings.sound);
      setNote(null);
      apply({ type: 'input', letter, keyId: ++keyId.current });
    },
    [apply, settings.haptics, settings.sound],
  );
  const onDelete = useCallback(() => {
    tap(settings.haptics);
    playSound('tick', settings.sound);
    setNote(null);
    apply({ type: 'erase', keyId: ++keyId.current });
  }, [apply, settings.haptics, settings.sound]);
  /** Hardware keyboard (iPad / Android / web): letters type, Delete erases, arrows move the selection. */
  const onHardwareKey = useCallback(
    (k: string) => {
      if (k === 'Backspace') onDelete();
      else if (k === 'ArrowLeft') apply({ type: 'move', delta: -1 });
      else if (k === 'ArrowRight') apply({ type: 'move', delta: 1 });
      else if (/^[A-Z]$/.test(k)) onLetter(k);
    },
    [apply, onDelete, onLetter],
  );

  const spend = (action: PuzzleAction) => {
    const prev = live.current.state;
    // Never charge for a hint that would change nothing.
    if (puzzleReducer(prev, action) === prev) return;
    if (!consumeHint(useAppStore.getState().root!, today())) {
      setNote(t('puzzle.noHints'));
      return;
    }
    update((r) => consumeHint(r, today()) ?? r);
    setNote(null);
    apply(action);
  };
  const onReveal = () => spend({ type: 'reveal' });
  const onCheck = () => {
    if (!hasPlayerEntries(live.current.state)) {
      setNote(t('puzzle.nothingToCheck'));
      return;
    }
    spend({ type: 'check' });
  };

  /** E2E builds only (EXPO_PUBLIC_E2E=1): types the answer so Maestro flows can finish a puzzle. */
  const e2eSolve = () => {
    let s = live.current.state;
    for (let i = 0; i < s.plain.length; i++) {
      const c = s.plain[i]!;
      if (c >= 'A' && c <= 'Z' && s.entries[i] !== c) {
        s = puzzleReducer(puzzleReducer(s, { type: 'select', index: i }), { type: 'input', letter: c, keyId: ++keyId.current });
      }
    }
    commit(s);
  };

  /** Player changed difficulty: restart this puzzle with new givens. */
  const restartWith = (d: Difficulty) => {
    const re = openPuzzle(useAppStore.getState().root!, ref, content, d);
    update(() => re.root);
    live.current.difficulty = d;
    setDifficulty(d);
    setNote(null);
    commit(re.state);
  };

  const flags = useMemo(() => cellFlags(state, settings.highlightConflicts), [state, settings.highlightConflicts]);
  const used = useMemo(() => usedLetters(state), [state]);
  // Full but wrong: a gentle note, no penalty. Derived, not stored.
  const message = note ?? (!state.solved && isFilled(state) ? t('puzzle.fullButWrong') : null);

  return {
    state,
    difficulty,
    flags,
    used,
    message,
    hintsLeft: hintsLeft(hints, date),
    showTimer: settings.showTimer,
    onSelect,
    onLetter,
    onDelete,
    onHardwareKey,
    onReveal,
    onCheck,
    restartWith,
    e2eSolve,
  };
}
