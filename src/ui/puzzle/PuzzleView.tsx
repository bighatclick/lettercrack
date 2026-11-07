import type { ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

import type { PuzzleState } from '@/engine/puzzle';

import { Inky } from '../fx/Inky';
import { Enter } from '../fx/motion';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { radius, softShadow, space } from '../tokens';
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
  /** Hide Reveal / Check (onboarding). */
  hideHints?: boolean;
  /** A general solving tip from Inky, shown under the board. Never a spoiler. */
  tip?: string;
};

/** Presentational puzzle screen body: board, Inky's tip, hints and keyboard. No storage, no routing. */
export function PuzzleView(p: PuzzleViewProps) {
  const { colors, isDark, highContrast } = useTheme();
  const canCheck = p.state.entries.some((e) => e !== '');
  return (
    <View style={styles.root}>
      {p.header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
        <Animated.View style={{ opacity: p.boardOpacity ?? 1 }}>
          <View
            style={[
              styles.boardCard,
              softShadow(colors.shadow, isDark ? 2 : 5),
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: highContrast ? 2 : isDark ? 1 : 0,
              },
            ]}
          >
            <Board state={p.state} flags={p.flags} onSelect={p.onSelect} reveal={p.reveal} />
          </View>
        </Animated.View>
        {p.tip && !p.state.solved ? (
          <Enter index={4} style={styles.tipRow}>
            <Inky pose="think" size={84} />
            <View style={[styles.tip, { backgroundColor: colors.primary }]}>
              <Text variant="caption" color="onPrimary">
                {p.tip}
              </Text>
            </View>
          </Enter>
        ) : null}
      </ScrollView>
      <View style={styles.bottom}>
        {p.message ? (
          <View style={[styles.message, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="caption" color="ink" accessibilityLiveRegion="polite" testID="puzzle-message">
              {p.message}
            </Text>
          </View>
        ) : null}
        {p.state.solved ? null : (
          <>
            {p.hideHints ? null : <HintBar hintsLeft={p.hintsLeft} canCheck={canCheck} onReveal={p.onReveal} onCheck={p.onCheck} />}
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
  scrollContent: { padding: space.md, gap: space.md },
  boardCard: { borderRadius: radius.xl, padding: space.md, paddingTop: space.lg },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tip: { flex: 1, padding: space.md, borderRadius: radius.lg, borderBottomLeftRadius: 4 },
  bottom: { gap: space.md, paddingHorizontal: space.md, paddingBottom: space.md, paddingTop: space.sm },
  message: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
});
