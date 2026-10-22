import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { type Content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { hintsAvailable } from '@/engine/hints';
import {
  type Difficulty,
  isFilled,
  type PuzzleAction,
  puzzleReducer,
  type PuzzleState,
  usedLetters,
} from '@/engine/puzzle';
import type { SolveResult } from '@/engine/streak';

import { cellFlags } from './flags';
import { completePuzzle, consumeHint, openPuzzle, type PuzzleRef, saveProgress } from './session';
import { today } from './today';

export type Completion = { clean: boolean; streak: SolveResult | null };

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
      let completion: Completion = { clean: false, streak: null };
      update((r) => {
        const c = completePuzzle(r, ref, l.difficulty, next, today());
        completion = { clean: c.clean, streak: c.streak };
        return c.root;
      });
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      l.onSolved(completion);
    },
    [ref, update, settings.haptics],
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
      setNote(null);
      apply({ type: 'input', letter, keyId: ++keyId.current });
    },
    [apply, settings.haptics],
  );
  const onDelete = useCallback(() => {
    tap(settings.haptics);
    setNote(null);
    apply({ type: 'erase', keyId: ++keyId.current });
  }, [apply, settings.haptics]);

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
    if (!live.current.state.entries.some((e) => e !== '')) {
      setNote(t('puzzle.nothingToCheck'));
      return;
    }
    spend({ type: 'check' });
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
    hintsLeft: hintsAvailable(hints, today()),
    showTimer: settings.showTimer,
    onSelect,
    onLetter,
    onDelete,
    onReveal,
    onCheck,
    restartWith,
  };
}
