import { type PressableProps, StyleSheet } from 'react-native';

import { PressScale } from '../fx/motion';
import { useTheme } from '../theme';
import { type Hue, minTouch, radius, space } from '../tokens';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & { label: string; selected?: boolean; hue?: Hue };

/** Small pill (e.g. the difficulty chip). Visual height is compact; hitSlop keeps the target ≥ 44 pt. */
export function Chip({ label, selected = false, hue, ...rest }: ChipProps) {
  const { colors, highContrast } = useTheme();
  const bg = selected ? colors.primary : hue ? hue.tint : colors.surfaceRaised;
  const fg = selected ? colors.onPrimary : hue ? hue.deep : colors.ink;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: selected ? colors.primary : highContrast ? colors.border : 'transparent',
        },
      ]}
      {...rest}
    >
      <Text variant="caption" color={fg}>
        {label}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch - 10,
    minWidth: minTouch,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
