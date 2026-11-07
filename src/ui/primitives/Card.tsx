import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';
import { radius, softShadow, space } from '../tokens';

/** White rounded card with a soft coloured shadow. `tint` swaps the fill (e.g. a hue tint). */
export function Card({ style, tint, ...rest }: ViewProps & { tint?: string }) {
  const { colors, highContrast, isDark } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        softShadow(colors.shadow, isDark ? 2 : 6),
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.border,
          borderWidth: highContrast ? 2 : isDark ? 1 : 0,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space.lg },
});
