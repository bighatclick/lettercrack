import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme';
import { fontFamily } from '../tokens';
import { useNoLoops } from './loops';
import { useLoop } from './motion';

const GHOST = 'QXRZKJMVPWEGTA';

/** Ghost cipher letters drifting through a hero header. Decorative. */
export const FloatingLetters = memo(function FloatingLetters({ colors, count = 9 }: { colors: readonly string[]; count?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Drift key={i} i={i} color={colors[i % colors.length] as string} />
      ))}
    </View>
  );
});

function Drift({ i, color }: { i: number; color: string }) {
  const v = useLoop(3200 + (i % 4) * 700, { delay: i * 180 });
  const left = `${(i * 37 + 7) % 92}%` as const;
  const top = `${(i * 53 + 11) % 80}%` as const;
  const size = 18 + ((i * 7) % 4) * 8;
  const rot = ((i * 29) % 40) - 20;
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: -v.value * 14 }, { rotate: `${rot + v.value * 10}deg` }],
    opacity: 0.18 + v.value * 0.14,
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left, top }, anim]}>
      <Text allowFontScaling={false} style={{ fontFamily: fontFamily.mono, fontSize: size, color }}>
        {GHOST[i % GHOST.length]}
      </Text>
    </Animated.View>
  );
}

const CONFETTI = ['#FF6B6B', '#FFC93C', '#20C3AF', '#4DA3FF', '#8B5CF6', '#FF7EB6'];

/** Letter tiles and paper strips raining down (solved screen). Hidden with Reduce Motion. */
export const Confetti = memo(function Confetti({ count = 22, height = 800 }: { count?: number; height?: number }) {
  const { reduceMotion } = useTheme();
  if (reduceMotion) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Piece key={i} i={i} height={height} />
      ))}
    </View>
  );
});

function Piece({ i, height }: { i: number; height: number }) {
  const fall = useSharedValue(0);
  // In E2E builds each piece falls once instead of forever (see useNoLoops).
  const once = useNoLoops();
  useEffect(() => {
    fall.set(withDelay((i * 233) % 2400, withRepeat(withTiming(1, { duration: 3200 + (i % 5) * 600, easing: Easing.linear }), once ? 1 : -1)));
    return () => cancelAnimation(fall);
  }, [fall, i, once]);
  const color = CONFETTI[i % CONFETTI.length] as string;
  const tile = i % 3 === 0;
  const sway = ((i * 17) % 30) - 15;
  const spin = (i % 2 ? 1 : -1) * (180 + (i % 4) * 90);
  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + fall.value * (height + 80) },
      { translateX: Math.sin(fall.value * Math.PI * 2) * sway },
      { rotate: `${fall.value * spin}deg` },
    ],
    opacity: fall.value < 0.02 ? 0 : 1,
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: `${(i * 41 + 3) % 96}%`, top: 0 }, anim]}>
      {tile ? (
        <View style={[styles.tile, { backgroundColor: color }]}>
          <Text allowFontScaling={false} style={styles.tileText}>
            {GHOST[i % GHOST.length]}
          </Text>
        </View>
      ) : (
        <View style={{ width: 8, height: 14, borderRadius: 2, backgroundColor: color }} />
      )}
    </Animated.View>
  );
}

/** A circular progress ring (0–1). */
export function ProgressRing({
  progress,
  size = 44,
  stroke = 5,
  color,
  track,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c * p} ${c}`}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
      ) : null}
    </Svg>
  );
}

/** A diagonal light sweep that glides across a button now and then. Parent must clip (overflow hidden). */
export function Shine({ width = 320 }: { width?: number }) {
  const v = useLoop(2600, { loop: true, delay: 600, rest: 0 });
  return <ShineBar v={v} width={width} />;
}

function ShineBar({ v, width }: { v: SharedValue<number>; width: number }) {
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: -80 + v.value * (width * 1.8 + 80) }, { rotate: '20deg' }],
    opacity: v.value > 0.55 ? 0 : 0.35,
  }));
  return <Animated.View pointerEvents="none" style={[styles.shine, anim]} />;
}

const styles = StyleSheet.create({
  tile: { width: 22, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fontFamily.mono, fontSize: 13, color: '#1E1B3A' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 36, backgroundColor: '#FFFFFF' },
});
