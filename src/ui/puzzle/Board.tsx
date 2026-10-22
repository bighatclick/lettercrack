import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { layoutText } from '@/engine/layout';
import { isLetterCell, isLockedCell, type PuzzleState, selectedCipher } from '@/engine/puzzle';

import { useTheme } from '../theme';
import { space } from '../tokens';
import { Cell } from './Cell';
import { cellsPerLine, useCellMetrics } from './metrics';

export type CellFlag = 'conflict' | 'wrong';

export type BoardProps = {
  state: PuzzleState;
  /** Flagged cells: conflicts (if the setting is on) and wrong letters. */
  flags: ReadonlyMap<number, CellFlag>;
  onSelect: (index: number) => void;
  /** 0 → 1 over the solve reveal. Undefined while playing. */
  reveal?: Animated.Value;
};

export function Board({ state, flags, onSelect, reveal }: BoardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const metrics = useCellMetrics();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width)), []);

  const maxCells = width > 0 ? cellsPerLine(width, metrics) : 0;
  const layout = useMemo(() => (maxCells > 0 ? layoutText(state.plain, maxCells) : null), [state.plain, maxCells]);
  const selCipher = selectedCipher(state);

  const letterOrder = useMemo(() => {
    const order = new Map<number, number>();
    let n = 0;
    for (let i = 0; i < state.plain.length; i++) if (isLetterCell(state, i)) order.set(i, n++);
    return { order, total: n };
  }, [state]);

  return (
    <View onLayout={onLayout} style={styles.board} testID="board">
      {layout?.lines.map((line, li) => (
        <View key={li} style={styles.line}>
          {line.map((tok) => (
            <View key={tok.start} style={[styles.word, { marginRight: metrics.cellWidth }]} role="group">
              {Array.from({ length: tok.end - tok.start }, (_, k) => {
                const i = tok.start + k;
                const letter = isLetterCell(state, i);
                const cipher = state.cipher[i] as string;
                const guess = state.entries[i] as string;
                const locked = letter && isLockedCell(state, i);
                const flag = flags.get(i);
                const isFlagged = flag !== undefined;
                let label = '';
                if (letter) {
                  label = guess ? t('puzzle.cellLabel', { cipher, guess }) : t('puzzle.cellLabelEmpty', { cipher });
                  if (locked) label += `, ${t('puzzle.cellGiven')}`;
                  if (flag) label += `, ${t(flag === 'wrong' ? 'puzzle.cellWrong' : 'puzzle.cellConflict')}`;
                }
                let cellReveal: Animated.AnimatedInterpolation<number> | undefined;
                if (reveal && letter) {
                  // Left to right: each cell flips during its own slice of the 0 → 1 progress.
                  const start = ((letterOrder.order.get(i) ?? 0) / Math.max(1, letterOrder.total)) * 0.75;
                  cellReveal = reveal.interpolate({
                    inputRange: [0, start, start + 0.25, 1],
                    outputRange: [0, 0, 1, 1],
                  });
                }
                return (
                  <Cell
                    key={i}
                    index={i}
                    char={state.plain[i] as string}
                    isLetter={letter}
                    cipher={cipher}
                    guess={guess}
                    selected={state.selected === i}
                    sameCipher={letter && selCipher !== null && cipher === selCipher}
                    locked={locked}
                    flagged={isFlagged}
                    label={label}
                    colors={colors}
                    metrics={metrics}
                    onSelect={onSelect}
                    reveal={cellReveal}
                  />
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { width: '100%', gap: space.sm },
  line: { flexDirection: 'row', flexWrap: 'nowrap' },
  word: { flexDirection: 'row' },
});
