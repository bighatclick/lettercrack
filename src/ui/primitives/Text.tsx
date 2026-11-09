import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { relayoutProps, useRelayoutEpoch } from '../relayout';
import { useTheme } from '../theme';
import { type Palette, type TextVariant, typeScale } from '../tokens';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  /** A palette key, or a raw colour (for text on gradients and hue tiles). */
  color?: keyof Palette | (string & {});
};

/**
 * Themed text. Scales with the in-app text-size slider and the OS text size.
 * Android uses the "simple" line breaker: with the default "highQuality" one, text with a fixed
 * line height was sometimes measured as one line but drawn as two, so the second line was cut off
 * (seen on tablets: "TODAY'S QUOTE" showed as "TODAY'S").
 * After a rotation, React Native is made to measure the text again instead of reusing a width from
 * before the rotation (D31, see `relayout.ts`).
 */
export function Text({ variant = 'body', color = 'ink', style, ...rest }: TextProps) {
  const { colors, textScale } = useTheme();
  const { maxFontSizeMultiplier, fontNudge } = relayoutProps(useRelayoutEpoch());
  const base = typeScale[variant];
  const resolved = (colors as Record<string, string>)[color] ?? color;
  const styles = [
    base,
    { color: resolved, fontSize: base.fontSize * textScale, lineHeight: base.lineHeight * textScale },
    style,
  ];
  const fontSize = fontNudge ? (StyleSheet.flatten(styles as TextStyle[]) ?? {}).fontSize : undefined;
  return (
    <RNText
      textBreakStrategy="simple"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}
      style={fontSize === undefined ? styles : [...styles, { fontSize: fontSize + fontNudge }]}
    />
  );
}
