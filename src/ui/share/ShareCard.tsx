import type { Ref } from 'react';
import { type HostInstance, StyleSheet, View } from 'react-native';

import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { space } from '../tokens';

/** Logical size; captured at 3x → 1080×1350 (S9). */
export const SHARE_CARD_SIZE = { width: 360, height: 450 } as const;

export type ShareCardProps = { text: string; author: string; dates: string; footer: string; ref?: Ref<HostInstance> };

/**
 * The share image: quote, author and footer on parchment. Uses the current theme and the
 * text-size setting; long quotes shrink to fit rather than being cut off.
 */
export function ShareCard({ text, author, dates, footer, ref }: ShareCardProps) {
  const { colors } = useTheme();
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.accent }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.rule, { backgroundColor: colors.accent }]} />
      <View style={styles.body}>
        <Text variant="quote" adjustsFontSizeToFit numberOfLines={11} minimumFontScale={0.5}>
          “{text}”
        </Text>
        <Text variant="label" color="primary" numberOfLines={1} adjustsFontSizeToFit>
          — {author}
        </Text>
        <Text variant="caption" color="inkMuted">
          {dates}
        </Text>
      </View>
      <Text variant="caption" color="inkMuted" numberOfLines={1} adjustsFontSizeToFit style={styles.footer}>
        {footer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_SIZE.width,
    height: SHARE_CARD_SIZE.height,
    padding: space.xl,
    borderWidth: 2,
    justifyContent: 'space-between',
  },
  rule: { width: 40, height: 3, borderRadius: 2 },
  body: { flex: 1, justifyContent: 'center', gap: space.sm },
  footer: { textAlign: 'center' },
});
