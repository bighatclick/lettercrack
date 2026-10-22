import { memo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '../tokens';
import { fontFamily } from '../tokens';
import type { CellMetrics } from './metrics';

export type CellProps = {
  index: number;
  /** Plain char for non-letter cells (punctuation, digits). */
  char: string;
  isLetter: boolean;
  cipher: string;
  guess: string;
  selected: boolean;
  sameCipher: boolean;
  locked: boolean;
  /** Conflict or marked wrong: fill + dotted underline (never colour alone). */
  flagged: boolean;
  label: string;
  colors: Palette;
  metrics: CellMetrics;
  onSelect: (index: number) => void;
  /** Solve reveal progress for this cell, 0 → 1. Undefined while playing. */
  reveal?: Animated.AnimatedInterpolation<number>;
};

function CellImpl(p: CellProps) {
  const { colors: c, metrics: m } = p;
  const guessStyle = { fontFamily: fontFamily.mono, fontSize: m.guessSize, lineHeight: m.guessSize * 1.3 };
  const cipherStyle = { fontFamily: fontFamily.mono, fontSize: m.cipherSize, lineHeight: m.cipherSize * 1.4 };

  if (!p.isLetter) {
    return (
      <View style={{ width: m.cellWidth, height: m.cellHeight, justifyContent: 'flex-end' }} accessible={false} importantForAccessibility="no">
        <Text allowFontScaling={false} style={[guessStyle, styles.center, { color: c.ink, marginBottom: 6 }]}>
          {p.char}
        </Text>
      </View>
    );
  }

  const bg = p.selected ? c.surfaceRaised : p.flagged ? c.conflictFill : 'transparent';
  const underline = p.sameCipher ? c.accent : c.border;
  const guessColor = p.flagged ? c.conflict : p.locked ? c.given : c.ink;
  const revealStyle = p.reveal
    ? {
        opacity: p.reveal.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
        transform: [{ perspective: 400 }, { rotateX: p.reveal.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) }],
      }
    : null;

  return (
    <Pressable
      onPress={() => p.onSelect(p.index)}
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ selected: p.selected, disabled: p.locked }}
      testID={`cell-${p.index}`}
      style={[styles.cell, { width: m.cellWidth, height: m.cellHeight, backgroundColor: bg }]}
    >
      <Text allowFontScaling={false} style={[cipherStyle, styles.center, { color: c.inkMuted }]}>
        {p.cipher}
      </Text>
      <Animated.Text allowFontScaling={false} style={[guessStyle, styles.center, { color: guessColor }, revealStyle]}>
        {p.guess || ' '}
      </Animated.Text>
      <View style={[styles.underline, { backgroundColor: underline, height: p.sameCipher ? 3 : 1.5 }]} />
      {p.flagged ? (
        <View style={styles.dots} testID={`cell-${p.index}-flag`}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: c.conflict }]} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export const Cell = memo(CellImpl);

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'flex-end', borderRadius: 4, paddingBottom: 3 },
  center: { textAlign: 'center' },
  underline: { alignSelf: 'stretch', marginHorizontal: 2, borderRadius: 1 },
  dots: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 0 },
  dot: { width: 2.5, height: 2.5, borderRadius: 1.25 },
});
