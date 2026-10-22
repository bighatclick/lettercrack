import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { fontFamily, keyHeight, radius, space } from '../tokens';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export type KeyboardProps = {
  onLetter: (letter: string) => void;
  onDelete: () => void;
  /** Letters already used on the board: dimmed, never disabled. */
  used: ReadonlySet<string>;
  disabled?: boolean;
};

function KeyboardImpl({ onLetter, onDelete, used, disabled }: KeyboardProps) {
  const { t } = useTranslation();
  const { colors, textScale } = useTheme();
  // Keys keep a fixed 52 pt height; the label grows a little with the text-size setting.
  const fontSize = 20 * Math.min(textScale, 1.3);

  const key = (label: string, onPress: () => void, opts: { a11y: string; hint?: string; dim?: boolean; wide?: boolean; testID: string }) => (
    <Pressable
      key={opts.testID}
      testID={opts.testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="keyboardkey"
      accessibilityLabel={opts.a11y}
      accessibilityHint={opts.hint}
      style={({ pressed }) => [
        styles.key,
        opts.wide ? styles.wide : null,
        {
          backgroundColor: pressed ? colors.border : colors.surfaceRaised,
          opacity: disabled ? 0.4 : opts.dim ? 0.5 : 1,
        },
      ]}
    >
      <Text allowFontScaling={false} style={{ fontFamily: fontFamily.mono, fontSize, color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.keyboard} testID="keyboard">
      {ROWS.map((row, r) => (
        <View key={row} style={styles.row}>
          {row.split('').map((l) =>
            key(l, () => onLetter(l), {
              a11y: t('puzzle.keyLetter', { letter: l }),
              hint: used.has(l) ? t('puzzle.keyUsed') : undefined,
              dim: used.has(l),
              testID: `key-${l}`,
            }),
          )}
          {r === 2 ? key('⌫', onDelete, { a11y: t('puzzle.delete'), wide: true, testID: 'key-delete' }) : null}
        </View>
      ))}
    </View>
  );
}

export const Keyboard = memo(KeyboardImpl);

const styles = StyleSheet.create({
  keyboard: { gap: space.sm, paddingHorizontal: space.xs, width: '100%', maxWidth: 640, alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: {
    flex: 1,
    maxWidth: 56,
    height: keyHeight,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 1.6, maxWidth: 90 },
});
