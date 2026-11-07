import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme';
import { type Palette, type TextVariant, typeScale } from '../tokens';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  /** A palette key, or a raw colour (for text on gradients and hue tiles). */
  color?: keyof Palette | (string & {});
};

/** Themed text. Scales with the in-app text-size slider and the OS text size. */
export function Text({ variant = 'body', color = 'ink', style, ...rest }: TextProps) {
  const { colors, textScale } = useTheme();
  const base = typeScale[variant];
  const resolved = (colors as Record<string, string>)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: resolved, fontSize: base.fontSize * textScale, lineHeight: base.lineHeight * textScale },
        style,
      ]}
    />
  );
}
