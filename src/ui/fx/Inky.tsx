import { memo, type ReactNode, useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { useNoLoops } from './loops';
import { OutfitBack, OutfitFace, OutfitHat, OutfitNeck } from './InkyOutfit';

/** What Inky wears (item ids from src/engine/wardrobe.ts). */
export type InkyOutfit = { hat: string | null; face: string | null; neck: string | null; bg: string | null };
const CLASSIC: InkyOutfit = { hat: null, face: 'monocle', neck: null, bg: null };

export type InkyPose = 'idle' | 'wave' | 'think' | 'cheer';

/** Drawing box: the 200 × 220 character plus room for the raised hand and sparkles. */
const VB = { x: -12, y: -4, w: 224, h: 228 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
const pct = (x: number, y: number) => `${(((x - VB.x) / VB.w) * 100).toFixed(1)}% ${(((y - VB.y) / VB.h) * 100).toFixed(1)}%`;

const BROWS: Record<InkyPose, [string, string]> = {
  idle: ['M60 96 Q74 89 88 94', 'M112 94 Q126 89 140 96'],
  wave: ['M60 92 Q74 83 88 89', 'M112 89 Q126 83 140 92'],
  think: ['M60 90 Q74 80 88 87', 'M112 97 Q126 94 140 98'],
  cheer: ['M60 90 Q74 78 88 87', 'M112 87 Q126 78 140 90'],
};

const BROW = '#17134F';
const LIMB_TOP = '#5E72F2';

/**
 * Inky, the LetterCrack mascot: a glossy blue ink drop with amber eyes and a brass monocle,
 * drawn in a soft 3D style. Bobs, blinks, waves and jumps; all motion stops with Reduce Motion.
 * Decorative unless a `label` is given.
 */
function InkyImpl({
  pose = 'idle',
  size = 140,
  label,
  outfit = CLASSIC,
}: {
  pose?: InkyPose;
  size?: number;
  label?: string;
  /** Defaults to the classic look: just the brass monocle. */
  outfit?: InkyOutfit;
}) {
  // Inky's bob, wave and blink loop forever, so they stay still under Reduce Motion and in E2E builds.
  const reduceMotion = useNoLoops();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}${uid}`;
  const url = (n: string) => `url(#${n}${uid})`;
  const w = size;
  const h = Math.round((size * VB.h) / VB.w);

  const bob = useSharedValue(0);
  const arm = useSharedValue(0);
  const twinkle = useSharedValue(1);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      bob.set(0);
      arm.set(0);
      twinkle.set(1);
      return;
    }
    if (pose === 'cheer') {
      bob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
          withTiming(-0.35, { duration: 120 }),
          withTiming(0, { duration: 180 }),
        ),
        -1,
      );
      twinkle.set(withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
    } else {
      bob.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true));
    }
    if (pose === 'wave') {
      arm.set(withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }), -1, true));
    } else if (pose === 'think') {
      arm.set(withRepeat(withDelay(600, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1, true));
    }
    return () => {
      cancelAnimation(bob);
      cancelAnimation(arm);
      cancelAnimation(twinkle);
    };
  }, [pose, reduceMotion, bob, arm, twinkle]);

  useEffect(() => {
    if (reduceMotion) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(() => {
      setBlink(true);
      off = setTimeout(() => setBlink(false), 140);
    }, 3800 + Math.round(Math.random() * 1200));
    return () => {
      clearInterval(t);
      if (off) clearTimeout(off);
    };
  }, [reduceMotion]);

  const scale = size / VB.w;
  const bodyStyle = useAnimatedStyle(() => {
    if (pose === 'cheer') {
      const up = Math.max(0, bob.value);
      const squash = Math.min(0, bob.value);
      return {
        transform: [
          { translateY: -up * 16 * scale * 1.6 },
          { scaleY: 1 + squash * 0.18 + up * 0.04 },
          { scaleX: 1 - squash * 0.12 - up * 0.02 },
        ],
      };
    }
    return { transform: [{ translateY: -bob.value * 6 * scale * 1.4 }] };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - Math.max(0, bob.value) * 0.25 }],
    opacity: 1 - Math.max(0, bob.value) * 0.35,
  }));
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose === 'wave' ? -22 * arm.value : -8 * arm.value}deg` }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({ opacity: twinkle.value, transform: [{ scale: 0.85 + twinkle.value * 0.15 }] }));

  const [browL, browR] = BROWS[pose];
  const dx = pose === 'think' ? 5 : 1;
  const dy = pose === 'think' ? -5 : 2;

  const defs = (
    <Defs>
      <RadialGradient id={id('body')} cx="0.36" cy="0.34" r="0.78">
        <Stop offset="0" stopColor="#9DB4FF" />
        <Stop offset="0.32" stopColor="#5A70F0" />
        <Stop offset="0.72" stopColor="#2F33A8" />
        <Stop offset="1" stopColor="#1A1660" />
      </RadialGradient>
      <RadialGradient id={id('belly')} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#B9C8FF" stopOpacity={0.55} />
        <Stop offset="1" stopColor="#B9C8FF" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={id('shine')} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={id('eye')} cx="0.42" cy="0.32" r="0.75">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.7" stopColor="#F1F3FF" />
        <Stop offset="1" stopColor="#BFC6EA" />
      </RadialGradient>
      <RadialGradient id={id('iris')} cx="0.5" cy="0.38" r="0.62">
        <Stop offset="0" stopColor="#FFE29A" />
        <Stop offset="0.5" stopColor="#F59A2A" />
        <Stop offset="1" stopColor="#8A3A0C" />
      </RadialGradient>
      <LinearGradient id={id('brass')} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFF2B8" />
        <Stop offset="0.45" stopColor="#F5BE2E" />
        <Stop offset="1" stopColor="#9C6A06" />
      </LinearGradient>
      <RadialGradient id={id('blush')} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#FF7A9C" stopOpacity={0.8} />
        <Stop offset="1" stopColor="#FF7A9C" stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={id('limb')} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#5E72F2" />
        <Stop offset="1" stopColor="#25217A" />
      </LinearGradient>
      <RadialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#140F3C" stopOpacity={0.45} />
        <Stop offset="1" stopColor="#140F3C" stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={id('mouth')} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#5A1238" />
        <Stop offset="1" stopColor="#2A0818" />
      </LinearGradient>
    </Defs>
  );

  const svg = (children: ReactNode) => (
    <Svg width={w} height={h} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
      {defs}
      {children}
    </Svg>
  );

  return (
    <View
      style={{ width: w, height: h }}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
      pointerEvents="none"
    >
      {outfit.bg ? svg(<OutfitBack id={outfit.bg} />) : null}
      <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
        {svg(<Ellipse cx="100" cy="212" rx="62" ry="10" fill={url('shadow')} />)}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(100, 212) }, bodyStyle]}>
        {pose === 'cheer' ? (
          <Animated.View style={[StyleSheet.absoluteFill, sparkleStyle]}>
            {svg(
              <>
                <Path d="M26 50l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#FFC93C" />
                <Path d="M176 36l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" fill="#20C3AF" />
                <Path d="M150 6l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#FF6B6B" />
                <Circle cx="46" cy="22" r="4" fill="#8B5CF6" />
              </>,
            )}
          </Animated.View>
        ) : null}
        {svg(
          <>
            {/* Feet */}
            <Ellipse cx="76" cy="203" rx="18" ry="10" fill={url('limb')} />
            <Ellipse cx="124" cy="203" rx="18" ry="10" fill={url('limb')} />
            <Ellipse cx="70" cy="199" rx="7" ry="3" fill="#FFFFFF" opacity={0.35} />
            <Ellipse cx="118" cy="199" rx="7" ry="3" fill="#FFFFFF" opacity={0.35} />
            {/* Body, rim light, belly glow, specular shine */}
            <Path d="M100 12 C109 40 170 94 170 140 A70 70 0 0 1 30 140 C30 94 91 40 100 12 Z" fill={url('body')} />
            <Path d="M150 92 Q172 128 160 172" fill="none" stroke="#C9B8FF" strokeWidth={4} strokeLinecap="round" opacity={0.55} />
            <Ellipse cx="100" cy="168" rx="50" ry="36" fill={url('belly')} />
            <Ellipse cx="68" cy="80" rx="14" ry="28" rotation={28} origin="68, 80" fill={url('shine')} opacity={0.75} />
            <Circle cx="72" cy="74" r="4.5" fill="#FFFFFF" />
            <Ellipse cx="98" cy="30" rx="3" ry="7" rotation={20} origin="98, 30" fill="#FFFFFF" opacity={0.6} />
            {/* Cheeks */}
            <Ellipse cx="56" cy="152" rx="16" ry="10" fill={url('blush')} />
            <Ellipse cx="144" cy="152" rx="16" ry="10" fill={url('blush')} />
            {/* Eyes */}
            {blink ? (
              <G>
                <Path d="M58 124 Q76 134 94 124" fill="none" stroke={BROW} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M106 124 Q124 134 142 124" fill="none" stroke={BROW} strokeWidth={4.5} strokeLinecap="round" />
              </G>
            ) : (
              <G>
                <Circle cx="76" cy="122" r="20" fill={url('eye')} />
                <Circle cx="124" cy="122" r="20" fill={url('eye')} />
                <Circle cx={76 + dx} cy={123 + dy} r="12" fill={url('iris')} />
                <Circle cx={124 + dx} cy={123 + dy} r="12" fill={url('iris')} />
                <Circle cx={76 + dx} cy={123 + dy} r="6.5" fill="#120E2E" />
                <Circle cx={124 + dx} cy={123 + dy} r="6.5" fill="#120E2E" />
                <Circle cx={80 + dx} cy={118 + dy} r="4" fill="#FFFFFF" />
                <Circle cx={128 + dx} cy={118 + dy} r="4" fill="#FFFFFF" />
                <Circle cx={72 + dx} cy={128 + dy} r="1.8" fill="#FFFFFF" />
                <Circle cx={120 + dx} cy={128 + dy} r="1.8" fill="#FFFFFF" />
                <Path d="M56 120 A20 20 0 0 1 96 120 Q76 108 56 120 Z" fill="#1A1660" opacity={0.22} />
                <Path d="M104 120 A20 20 0 0 1 144 120 Q124 108 104 120 Z" fill="#1A1660" opacity={0.22} />
              </G>
            )}
            <Path d={browL} fill="none" stroke={BROW} strokeWidth={5.5} strokeLinecap="round" />
            <Path d={browR} fill="none" stroke={BROW} strokeWidth={5.5} strokeLinecap="round" />
            {/* Brass monocle and chain (the classic look), or a wardrobe pair of glasses */}
            {outfit.face === 'monocle' ? (
              <G>
                <Circle cx="124" cy="122" r="25" fill="#CFE6FF" fillOpacity={0.16} stroke={url('brass')} strokeWidth={5} />
                <Path d="M108 110 Q114 101 125 99" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.75} />
                <Path d="M148 128 Q162 152 152 178" fill="none" stroke="#F5BE2E" strokeWidth={2} strokeDasharray="2.5 3.5" strokeLinecap="round" />
              </G>
            ) : (
              <OutfitFace id={outfit.face} />
            )}
            <OutfitNeck id={outfit.neck} />
            <OutfitHat id={outfit.hat} />
            {/* Mouth */}
            {pose === 'idle' || pose === 'think' ? (
              <G>
                <Path d="M86 156 Q100 170 114 156" fill="none" stroke={BROW} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M83 153 q2 3 4 3 M117 153 q-2 3 -4 3" fill="none" stroke={BROW} strokeWidth={2.5} strokeLinecap="round" />
              </G>
            ) : pose === 'wave' ? (
              <G>
                <Path d="M84 152 Q100 176 116 152 Z" fill={url('mouth')} />
                <Path d="M88 153 Q100 157 112 153 L111 157 Q100 161 89 157 Z" fill="#FFFFFF" />
                <Ellipse cx="100" cy="166" rx="7" ry="4" fill="#FF7A8A" />
              </G>
            ) : (
              <G>
                <Path d="M80 148 Q100 188 120 148 Z" fill={url('mouth')} />
                <Path d="M85 149 Q100 154 115 149 L114 154 Q100 159 86 154 Z" fill="#FFFFFF" />
                <Ellipse cx="100" cy="172" rx="10" ry="6" fill="#FF7A8A" />
              </G>
            )}
            {/* Arms that don't move */}
            {pose !== 'cheer' ? (
              <G>
                <Path d="M42 150 Q24 166 30 186" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                <Circle cx="30" cy="189" r="9.5" fill={url('limb')} />
              </G>
            ) : (
              <G>
                <Path d="M42 146 Q16 124 24 94" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                <Circle cx="24" cy="89" r="10.5" fill={LIMB_TOP} />
                <Path d="M158 146 Q184 124 176 94" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                <Circle cx="176" cy="89" r="10.5" fill={LIMB_TOP} />
                <Circle cx="21" cy="85" r="3" fill="#FFFFFF" opacity={0.5} />
                <Circle cx="173" cy="85" r="3" fill="#FFFFFF" opacity={0.5} />
              </G>
            )}
            {pose === 'idle' ? (
              <G>
                <Path d="M158 150 Q176 166 170 186" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                <Circle cx="170" cy="189" r="9.5" fill={url('limb')} />
              </G>
            ) : null}
          </>,
        )}
        {pose === 'wave' || pose === 'think' ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(158, 150) }, armStyle]}>
            {svg(
              pose === 'wave' ? (
                <>
                  <Path d="M158 148 Q184 128 180 98" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                  <Circle cx="180" cy="93" r="10.5" fill={LIMB_TOP} />
                  <Circle cx="177" cy="89" r="3" fill="#FFFFFF" opacity={0.5} />
                  <Path d="M195 80 q6 6 4 14 M201 69 q9 9 6 22" fill="none" stroke="#FFC93C" strokeWidth={3} strokeLinecap="round" />
                </>
              ) : (
                <>
                  <Path d="M158 154 Q184 152 186 130" fill="none" stroke={url('limb')} strokeWidth={12} strokeLinecap="round" />
                  <Line x1="187" y1="127" x2="191" y2="111" stroke="#B5552B" strokeWidth={8} strokeLinecap="round" />
                  <Circle cx="186" cy="130" r="9.5" fill={LIMB_TOP} />
                  <Circle cx="194" cy="92" r="18" fill="#BFE6FF" fillOpacity={0.45} stroke={url('brass')} strokeWidth={6} />
                  <Path d="M185 85 q5 -6 12 -5" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
                </>
              ),
            )}
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

export const Inky = memo(InkyImpl);
