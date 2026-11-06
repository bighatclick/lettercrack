import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { type GradientName, gradients } from '../tokens';

export type Glow = { x: number; y: number; r: number; color: string; opacity?: number };

export type GradientProps = {
  /** A named gradient, or explicit colours (top-left → bottom-right). */
  name?: GradientName;
  colors?: readonly string[];
  /** Soft radial highlights, in percent of the box. */
  glows?: readonly Glow[];
  /** 'diagonal' (default) or 'vertical'. */
  direction?: 'diagonal' | 'vertical';
};

/** Absolute-fill gradient background, drawn with SVG so no extra native module is needed. */
export function Gradient({ name = 'night', colors, glows = [], direction = 'diagonal' }: GradientProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const stops = colors ?? gradients[name].colors;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2={direction === 'vertical' ? '0' : '1'} y2="1">
          {stops.map((c, i) => (
            <Stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
        {glows.map((g, i) => (
          <RadialGradient key={i} id={`r${id}${i}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity ?? 0.45} />
            <Stop offset="1" stopColor={g.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#g${id})`} />
      {glows.map((g, i) => (
        <Ellipse key={i} cx={g.x} cy={g.y} rx={g.r} ry={g.r} fill={`url(#r${id}${i})`} />
      ))}
    </Svg>
  );
}
