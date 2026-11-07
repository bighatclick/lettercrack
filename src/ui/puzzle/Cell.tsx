import { memo, useEffect } from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';

import { shade } from '../color';
import type { Hue, Palette } from '../tokens';
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
  /** The colour family of this cell's word. */
  hue: Hue;
  isDark: boolean;
  reduceMotion: boolean;
  metrics: CellMetrics;
  onSelect: (index: number) => void;
  /** Solve reveal progress for this cell, 0 → 1. Undefined while playing. */
  reveal?: RNAnimated.AnimatedInterpolation<number>;
};

function CellImpl(p: CellProps) {
  const { colors: c, metrics: m, hue } = p;
  const guessStyle = { fontFamily: fontFamily.mono, fontSize: m.guessSize, lineHeight: m.guessSize * 1.25 };
  const cipherStyle = { fontFamily: fontFamily.mono, fontSize: m.cipherSize, lineHeight: m.cipherSize * 1.35 };
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(p.reduceMotion ? (p.selected ? 1 : 0) : withSpring(p.selected ? 1 : 0, { damping: 11, stiffness: 260 }));
  }, [p.selected, p.reduceMotion, lift]);
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 3 }, { scale: 1 + lift.value * 0.08 }, { rotate: `${-lift.value * 3}deg` }],
  }));

  if (!p.isLetter) {
    return (
      <View style={{ width: m.cellWidth, height: m.cellHeight, justifyContent: 'flex-end' }} accessible={false} importantForAccessibility="no">
        <Text allowFontScaling={false} style={[guessStyle, styles.center, { color: c.ink, marginBottom: 4 }]}>
          {p.char}
        </Text>
      </View>
    );
  }

  const filled = p.guess !== '';
  let bg = hue.tint;
  let edge = hue.solid;
  let fg = c.ink;
  let border = 'transparent';
  if (p.flagged) {
    bg = c.conflictFill;
    edge = c.conflict;
    fg = c.conflict;
    border = c.conflict;
  } else if (p.selected) {
    bg = c.accent;
    edge = '#C98A00';
    fg = c.onAccent;
    border = c.primary;
  } else if (p.sameCipher) {
    bg = p.isDark ? '#4A3F1F' : '#FFF1C2';
    edge = c.accent;
    fg = c.ink;
  } else if (p.locked) {
    bg = c.surface;
    edge = hue.solid;
    fg = c.given;
    border = hue.solid;
  } else if (filled) {
    bg = hue.solid;
    edge = shade(hue.solid);
    fg = hue.on;
  }

  const revealStyle = p.reveal
    ? {
        opacity: p.reveal.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
        transform: [{ perspective: 400 }, { rotateY: p.reveal.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) }],
      }
    : null;
  const tileH = Math.ceil(m.guessSize * 1.25 + 6);

  return (
    <Pressable
      onPress={() => p.onSelect(p.index)}
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ selected: p.selected, disabled: p.locked }}
      testID={`cell-${p.index}`}
      style={[styles.cell, { width: m.cellWidth, height: m.cellHeight }]}
    >
      <Text allowFontScaling={false} style={[cipherStyle, styles.center, { color: p.selected ? c.primary : hue.deep }]}>
        {p.cipher}
      </Text>
      <Animated.View style={[styles.tileWrap, liftStyle, { zIndex: p.selected ? 2 : 0 }]}>
        <RNAnimated.View
          style={[
            styles.tile,
            {
              height: tileH,
              backgroundColor: bg,
              borderBottomColor: edge,
              borderColor: border,
              borderWidth: border === 'transparent' ? 0 : p.selected ? 2.5 : 1.5,
              borderBottomWidth: 4,
            },
            revealStyle,
          ]}
        >
          {filled ? (
            <Animated.Text
              key={p.guess}
              entering={p.reveal || p.reduceMotion ? undefined : ZoomIn.springify().damping(10)}
              allowFontScaling={false}
              style={[guessStyle, styles.center, { color: fg }]}
            >
              {p.guess}
            </Animated.Text>
          ) : (
            <Text allowFontScaling={false} style={[guessStyle, styles.center, { color: fg }]}>
              {' '}
            </Text>
          )}
        </RNAnimated.View>
      </Animated.View>
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
  cell: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  center: { textAlign: 'center' },
  tileWrap: { alignSelf: 'stretch', marginHorizontal: 1.5 },
  tile: { borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dots: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 0 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});
