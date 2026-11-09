import { useState } from 'react';
import { PixelRatio, StyleSheet, type TextLayoutEvent } from 'react-native';

import { fitTitleSize, MIN_TITLE_SHRINK, splitsAWord, TITLE_SHRINK_STEP } from '../fitTitle';
import { useTheme } from '../theme';
import { typeScale } from '../tokens';
import { Text, type TextProps } from './Text';

/** Average Nunito advance width in em, with a small margin. */
const UI_CHAR_EM = 0.56;

/** The total text scale: the in-app size times the OS font size. */
export function useFontScale(): number {
  const { textScale } = useTheme();
  return textScale * PixelRatio.getFontScale();
}

/**
 * Text for narrow, fixed-width spots (badge names, tile titles, wardrobe labels). Scales with the
 * text size like any text, but never so far that a word breaks in the middle ("Cent / ury"):
 * the size is capped so the longest word fits, then shrunk a little more if a line still splits.
 */
/** Width for a fixed-width column of text: grows with the text size, up to `max` times. */
export function useScaledWidth(width: number, max = 1.6): number {
  const scale = useFontScale();
  return Math.round(width * Math.min(max, Math.max(1, scale)));
}

export function FitText({
  children,
  variant = 'body',
  style,
  onLayout,
  fitFor,
  ...rest
}: TextProps & {
  children: string;
  /** Size as if showing this text instead (e.g. the longest of a row of tile titles, so they match). */
  fitFor?: string;
}) {
  const scale = useFontScale();
  const base = typeScale[variant];
  const [width, setWidth] = useState(0);
  const wanted = base.fontSize * scale;
  const sizing = fitFor ?? children;
  const key = `${sizing}|${children}|${width}|${wanted}`;
  const [fix, setFix] = useState({ key: '', shrink: 1 });
  const shrink = fix.key === key ? fix.shrink : 1;
  // The estimate never goes below the unscaled size; only a measured split shrinks it further.
  const size = Math.max(Math.min(wanted, base.fontSize), fitTitleSize(sizing, width, wanted, UI_CHAR_EM)) * shrink;
  const onTextLayout = (e: TextLayoutEvent) => {
    if (width > 0 && shrink > MIN_TITLE_SHRINK && splitsAWord(e.nativeEvent.lines.map((l) => l.text))) {
      setFix({ key, shrink: shrink * TITLE_SHRINK_STEP });
    }
  };
  return (
    <Text
      variant={variant}
      allowFontScaling={false}
      {...rest}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        onLayout?.(e);
      }}
      onTextLayout={onTextLayout}
      style={[styles.stretch, style, { fontSize: size, lineHeight: size * (base.lineHeight / base.fontSize) }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ stretch: { alignSelf: 'stretch' } });
