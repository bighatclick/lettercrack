import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../fx/Icon';
import { PressScale } from '../fx/motion';
import { useTheme } from '../theme';
import { fontFamily, keyHeight, radius, space } from '../tokens';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
/** Each row has its own coloured 3D edge: sky, teal, pink. */
const ROW_EDGES = ['#7FB8FF', '#3FDCC6', '#FF9EC4'];

export type KeyboardProps = {
  onLetter: (letter: string) => void;
  onDelete: () => void;
  /** Letters already used on the board: dimmed, never disabled. */
  used: ReadonlySet<string>;
  disabled?: boolean;
};

function KeyboardImpl({ onLetter, onDelete, used, disabled }: KeyboardProps) {
  const { t } = useTranslation();
  const { colors, isDark, highContrast } = useTheme();
  const { textScale } = useTheme();
  // Keys keep a fixed 52 pt height; the label grows a little with the text-size setting.
  const fontSize = 20 * Math.min(textScale, 1.3);
  const keyBg = isDark ? colors.surfaceRaised : colors.surface;

  return (
    <View style={styles.keyboard} testID="keyboard">
      {ROWS.map((row, r) => (
        <View key={row} style={styles.row}>
          {row.split('').map((l) => {
            const dim = used.has(l);
            return (
              <PressScale
                key={l}
                testID={`key-${l}`}
                onPress={() => onLetter(l)}
                disabled={disabled}
                accessibilityRole="keyboardkey"
                accessibilityLabel={t('puzzle.keyLetter', { letter: l })}
                accessibilityHint={dim ? t('puzzle.keyUsed') : undefined}
                style={[
                  styles.key,
                  {
                    backgroundColor: dim ? colors.surfaceRaised : keyBg,
                    borderBottomColor: dim ? colors.border : (ROW_EDGES[r] as string),
                    borderColor: highContrast ? colors.border : 'transparent',
                    borderWidth: highContrast ? 1.5 : 0,
                    borderBottomWidth: 4,
                    opacity: disabled ? 0.4 : dim ? 0.55 : 1,
                  },
                ]}
              >
                <Text allowFontScaling={false} style={{ fontFamily: fontFamily.mono, fontSize, color: colors.ink }}>
                  {l}
                </Text>
              </PressScale>
            );
          })}
          {r === 2 ? (
            <PressScale
              testID="key-delete"
              onPress={onDelete}
              disabled={disabled}
              accessibilityRole="keyboardkey"
              accessibilityLabel={t('puzzle.delete')}
              style={[styles.key, styles.wide, { backgroundColor: colors.primary, borderBottomColor: '#3E1E9E', borderBottomWidth: 4 }]}
            >
              <Icon name="delete" color={colors.onPrimary} size={24} />
            </PressScale>
          ) : null}
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
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B2A80',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wide: { flex: 1.6, maxWidth: 90 },
});
