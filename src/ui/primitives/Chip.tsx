import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { useTheme } from '../theme';
import { minTouch, radius, space } from '../tokens';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & { label: string; selected?: boolean };

/** Small pill (e.g. the difficulty chip). Visual height is compact; hitSlop keeps the target ≥ 44 pt. */
export function Chip({ label, selected = false, ...rest }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      {...rest}
    >
      <Text variant="caption" color={selected ? 'onPrimary' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch - 12,
    minWidth: minTouch,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
