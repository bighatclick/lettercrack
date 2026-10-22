import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme';
import { type Palette, type TextVariant, typeScale } from '../tokens';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof Palette;
};

/** Themed text. Scales with the in-app text-size slider and the OS text size. */
export function Text({ variant = 'body', color = 'ink', style, ...rest }: TextProps) {
  const { colors, textScale } = useTheme();
  const base = typeScale[variant];
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: colors[color], fontSize: base.fontSize * textScale, lineHeight: base.lineHeight * textScale },
        style,
      ]}
    />
  );
}
