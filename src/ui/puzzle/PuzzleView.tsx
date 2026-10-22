import type { ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

import type { PuzzleState } from '@/engine/puzzle';

import { Text } from '../primitives/Text';
import { space } from '../tokens';
import { Board, type CellFlag } from './Board';
import { HintBar } from './HintBar';
import { Keyboard } from './Keyboard';

export type PuzzleViewProps = {
  state: PuzzleState;
  flags: ReadonlyMap<number, CellFlag>;
  used: ReadonlySet<string>;
  hintsLeft: number;
  message: string | null;
  header?: ReactNode;
  reveal?: Animated.Value;
  boardOpacity?: Animated.Value;
  onSelect: (index: number) => void;
  onLetter: (letter: string) => void;
  onDelete: () => void;
  onReveal: () => void;
  onCheck: () => void;
};

/** Presentational puzzle screen body: board, status line, hints and keyboard. No storage, no routing. */
export function PuzzleView(p: PuzzleViewProps) {
  const canCheck = p.state.entries.some((e) => e !== '');
  return (
    <View style={styles.root}>
      {p.header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
        <Animated.View style={{ opacity: p.boardOpacity ?? 1 }}>
          <Board state={p.state} flags={p.flags} onSelect={p.onSelect} reveal={p.reveal} />
        </Animated.View>
      </ScrollView>
      <View style={styles.bottom}>
        {p.message ? (
          <Text variant="caption" color="inkMuted" accessibilityLiveRegion="polite" testID="puzzle-message">
            {p.message}
          </Text>
        ) : null}
        {p.state.solved ? null : (
          <>
            <HintBar hintsLeft={p.hintsLeft} canCheck={canCheck} onReveal={p.onReveal} onCheck={p.onCheck} />
            <Keyboard onLetter={p.onLetter} onDelete={p.onDelete} used={p.used} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 820, alignSelf: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg },
  bottom: { gap: space.md, paddingHorizontal: space.md, paddingBottom: space.md },
});
