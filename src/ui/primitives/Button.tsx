import { type PressableProps, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Shine } from '../fx/Decor';
import { Gradient } from '../fx/Gradient';
import { Icon, type IconName } from '../fx/Icon';
import { PressScale } from '../fx/motion';
import { useTheme } from '../theme';
import { minTouch, radius, space } from '../tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'sunny' | 'teal' | 'sky' | 'coral' | 'glass';

const FILLED: Partial<Record<Variant, { gradient: readonly string[]; edge: string; text: string; shine?: boolean }>> = {
  primary: { gradient: ['#5B34D6', '#7A4CF0', '#8B5CF6'], edge: '#3E1E9E', text: '#FFFFFF', shine: true },
  sunny: { gradient: ['#FFB020', '#FFC93C', '#FFD866'], edge: '#C98A00', text: '#1E1B3A', shine: true },
  teal: { gradient: ['#14B09C', '#20C3AF', '#3FD6C2'], edge: '#0A7A6C', text: '#0E2E2A' },
  sky: { gradient: ['#3A8FF0', '#4DA3FF', '#74B8FF'], edge: '#1F62B5', text: '#0E1F3A' },
  coral: { gradient: ['#FF5A5A', '#FF6B6B', '#FF8A80'], edge: '#C23B3B', text: '#1E1B3A' },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  /** Smaller height for secondary rows. Still ≥ 44 pt. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', icon, compact, disabled, style, ...rest }: ButtonProps) {
  const { colors, highContrast } = useTheme();
  const filled = FILLED[variant];
  const height = compact ? minTouch : minTouch + 10;
  let fg: string = colors.primary;
  let box: ViewStyle = {};
  if (filled) {
    fg = filled.text;
    box = { borderBottomWidth: 4, borderBottomColor: filled.edge };
  } else if (variant === 'secondary') {
    box = { backgroundColor: colors.surface, borderWidth: highContrast ? 2 : 1.5, borderColor: colors.border, borderBottomWidth: 4 };
  } else if (variant === 'glass') {
    fg = '#FFFFFF';
    box = { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' };
  }
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[styles.base, { minHeight: height, opacity: disabled ? 0.45 : 1 }, box, style]}
      {...rest}
    >
      {filled ? (
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          <Gradient colors={filled.gradient} direction="vertical" />
          {filled.shine && !disabled ? <Shine /> : null}
        </View>
      ) : null}
      <View style={styles.row}>
        {icon ? <Icon name={icon} color={fg} size={compact ? 18 : 20} /> : null}
        <Text variant="label" color={fg} style={styles.label}>
          {label}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: space.xl,
    borderRadius: radius.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clip: { borderRadius: radius.md + 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  label: { textAlign: 'center', flexShrink: 1 },
});
