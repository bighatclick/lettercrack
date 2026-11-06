import { type ReactNode, useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { motion } from '../tokens';

/**
 * Slides and fades children in, `index` steps after the screen appears.
 * Reanimated skips layout animations when the OS Reduce Motion setting is on.
 */
export function Enter({ index = 0, children, style, kind = 'up' }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle>; kind?: 'up' | 'pop' }) {
  const entering =
    kind === 'pop'
      ? ZoomIn.delay(index * motion.staggerMs).springify().damping(12)
      : FadeInDown.delay(index * motion.staggerMs).springify().damping(16);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that squishes down on press with a spring. */
export function PressScale({ style, children, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { reduceMotion } = useTheme();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion) s.set(withSpring(0.94, { damping: 15, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, { damping: 10, stiffness: 300 }));
        onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** A looping value 0 → 1 → 0 (or a sawtooth when `loop`), frozen at `rest` with Reduce Motion. */
export function useLoop(durationMs: number, opts: { delay?: number; loop?: boolean; rest?: number } = {}) {
  const { reduceMotion } = useTheme();
  const v = useSharedValue(opts.rest ?? 0);
  const { delay = 0, loop = false, rest = 0 } = opts;
  useEffect(() => {
    if (reduceMotion) {
      v.set(rest);
      return;
    }
    v.set(0);
    const t = withTiming(1, { duration: durationMs, easing: loop ? Easing.linear : Easing.inOut(Easing.sin) });
    v.set(withDelay(delay, withRepeat(loop ? withSequence(t, withTiming(0, { duration: 0 })) : t, -1, !loop)));
    return () => cancelAnimation(v);
  }, [reduceMotion, durationMs, delay, loop, rest, v]);
  return v;
}

/** A gentle repeating pulse (scale), e.g. for "today" or the current level. */
export function Pulse({ children, style, amount = 0.08 }: { children: ReactNode; style?: StyleProp<ViewStyle>; amount?: number }) {
  const v = useLoop(900);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * amount }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Floats children up and down. */
export function Float({ children, style, distance = 6, duration = 1600, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; distance?: number; duration?: number; delay?: number }) {
  const v = useLoop(duration, { delay });
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -v.value * distance }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Wiggles children by a few degrees now and then. */
export function Wiggle({ children, style, degrees = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; degrees?: number }) {
  const { reduceMotion } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    v.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1, { duration: 90 })),
        withTiming(-1, { duration: 120 }),
        withTiming(0.6, { duration: 100 }),
        withTiming(0, { duration: 90 }),
      ),
      -1,
    );
    return () => cancelAnimation(v);
  }, [reduceMotion, v]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * degrees}deg` }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
