import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import { PixelRatio, StyleSheet, type TextLayoutEvent, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingLetters } from '../fx/Decor';
import { Gradient } from '../fx/Gradient';
import { Icon, type IconName } from '../fx/Icon';
import { PressScale } from '../fx/motion';
import { fitTitleSize, MIN_TITLE_SHRINK, splitsAWord, TITLE_SHRINK_STEP } from '../fitTitle';
import { useTheme } from '../theme';
import { type GradientName, gradients, minTouch, radius, space, typeScale } from '../tokens';
import { Text } from './Text';

const LETTER_COLORS: Record<GradientName, readonly string[]> = {
  night: ['#FFC93C', '#FF7EB6', '#20C3AF', '#FFFFFF', '#4DA3FF'],
  candy: ['#FFC93C', '#FFFFFF', '#20C3AF'],
  sunset: ['#FFFFFF', '#6D3FE0', '#1E1B3A'],
  lagoon: ['#FFFFFF', '#0E2E2A', '#FFC93C'],
  sunshine: ['#FFFFFF', '#FF6B6B', '#6D3FE0'],
  sky: ['#FFFFFF', '#0E1F3A', '#FFC93C'],
};

/**
 * Edge-to-edge gradient header with drifting cipher letters and rounded bottom corners.
 * `back` shows a round back button; `action` an extra round button on the right.
 */
export function Hero({
  gradient = 'night',
  title,
  subtitle,
  overline,
  back,
  action,
  side,
  children,
  testID,
}: {
  gradient?: GradientName;
  title?: string;
  subtitle?: string;
  overline?: string;
  back?: { label: string; onPress: () => void; testID?: string };
  action?: { icon: IconName; label: string; onPress: () => void; testID?: string };
  /** Shown to the right of the title (usually Inky). */
  side?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const g = gradients[gradient];
  const { textScale } = useTheme();
  const [titleWidth, setTitleWidth] = useState(0);
  // Scaled like any text (OS size × in-app size), but never so large that one word splits:
  // first an estimate from the longest word, then, if a laid-out line still breaks inside a word,
  // a few small shrink steps. The correction resets whenever the title, width or size changes.
  const wanted = typeScale.hero.fontSize * textScale * PixelRatio.getFontScale();
  const fitKey = `${title}|${titleWidth}|${wanted}`;
  const [fix, setFix] = useState({ key: '', shrink: 1 });
  const shrink = fix.key === fitKey ? fix.shrink : 1;
  const titleSize = fitTitleSize(title ?? '', titleWidth, wanted) * shrink;
  const titleStyle = { fontSize: titleSize, lineHeight: titleSize * (typeScale.hero.lineHeight / typeScale.hero.fontSize) };
  const onTitleLayout = (e: TextLayoutEvent) => {
    if (titleWidth > 0 && shrink > MIN_TITLE_SHRINK && splitsAWord(e.nativeEvent.lines.map((l) => l.text))) {
      setFix({ key: fitKey, shrink: shrink * TITLE_SHRINK_STEP });
    }
  };
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.sm }]} testID={testID}>
      <StatusBar style={g.text === '#FFFFFF' ? 'light' : 'dark'} />
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Gradient
          name={gradient}
          glows={[
            { x: 88, y: 12, r: 46, color: g.glow, opacity: 0.4 },
            { x: 6, y: 92, r: 40, color: '#FF7EB6', opacity: 0.28 },
          ]}
        />
        <FloatingLetters colors={LETTER_COLORS[gradient]} />
      </View>
      <View style={styles.inner}>
        {back || action ? (
          <View style={styles.bar}>
            {back ? <RoundButton icon="back" label={back.label} onPress={back.onPress} color={g.text} testID={back.testID} /> : <View />}
            {action ? (
              <RoundButton icon={action.icon} label={action.label} onPress={action.onPress} color={g.text} testID={action.testID} />
            ) : null}
          </View>
        ) : null}
        <View style={styles.titleRow}>
          <View style={styles.titles} onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}>
            {overline ? (
              <Text variant="overline" color={g.textMuted} style={styles.overline}>
                {overline.toUpperCase()}
              </Text>
            ) : null}
            {title ? (
              <Text variant="hero" color={g.text} accessibilityRole="header" allowFontScaling={false} style={titleStyle} onTextLayout={onTitleLayout}>
                {title}
              </Text>
            ) : null}
            {subtitle ? <Text color={g.textMuted}>{subtitle}</Text> : null}
          </View>
          {side}
        </View>
        {children}
      </View>
    </View>
  );
}

/** Round translucent icon button for use on gradients. */
export function RoundButton({
  icon,
  label,
  onPress,
  color,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  testID?: string;
}) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.round} testID={testID}>
      <Icon name={icon} color={color} size={22} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: space.xxl + space.xxl, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  clip: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  inner: { paddingHorizontal: space.lg, gap: space.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  titles: { flex: 1, gap: space.xs },
  overline: { letterSpacing: 1.4 },
  round: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
