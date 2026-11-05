import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '../theme';
import { minTouch, space } from '../tokens';
import { Text } from './Text';

/** A labelled on/off row. The whole row is the touch target (≥ 44 pt). */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}
      testID={testID}
    >
      <View style={styles.text}>
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" color="inkMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surfaceRaised}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

/** A labelled row holding arbitrary controls underneath (e.g. a row of chips). */
export function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.choice} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="label">{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** A tappable row that navigates or opens something. */
export function LinkRow({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={styles.row} testID={testID}>
      <Text variant="label" color="primary">
        {label}
      </Text>
      <Text color="inkMuted">›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 2 },
  choice: { gap: space.sm, paddingVertical: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
