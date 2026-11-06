import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { space } from '../tokens';

/**
 * Full-screen scrollable page on the cream background. Centred and width-capped for iPad.
 * A `hero` is drawn edge to edge at the top (it handles the status-bar inset itself).
 */
export function Screen({ children, hero, testID }: { children: ReactNode; hero?: ReactNode; testID?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} testID={testID}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: hero ? 0 : insets.top + space.sm, paddingBottom: insets.bottom + space.xxl }]}
      >
        {hero}
        <View
          style={[
            styles.content,
            { paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg },
            hero ? styles.underHero : null,
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center', paddingTop: space.lg },
  underHero: { marginTop: -space.xxl - space.lg },
});
