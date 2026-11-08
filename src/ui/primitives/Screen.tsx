import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { space } from '../tokens';

/**
 * Full-screen scrollable page on the cream background. Centred and width-capped for iPad.
 * A `hero` is drawn edge to edge at the top (it handles the status-bar inset itself).
 */
export function Screen({ children, hero, testID }: { children: ReactNode; hero?: ReactNode; testID?: string }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const backdrop = useStatusBackdrop(hero ? space.xl : 2);
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} testID={testID}>
      <ScrollView
        onScroll={backdrop.onScroll}
        scrollEventThrottle={32}
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
      {backdrop.on ? <StatusBackdrop color={colors.bg} light={isDark} /> : null}
    </View>
  );
}

/** True once a scroll view has scrolled past `threshold`; pass `onScroll` to the ScrollView. */
export function useStatusBackdrop(threshold: number) {
  const [on, setOn] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const past = e.nativeEvent.contentOffset.y > threshold;
    if (past !== on) setOn(past);
  };
  return { on, onScroll };
}

/**
 * A solid strip behind the status bar, shown once the page has scrolled, so content never shows
 * through the clock and icons. Also sets the status-bar style for that strip.
 */
export function StatusBackdrop({ color, light }: { color: string; light: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style={light ? 'light' : 'dark'} />
      <View pointerEvents="none" style={[styles.backdrop, { height: insets.top, backgroundColor: color }]} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center', paddingTop: space.lg },
  underHero: { marginTop: -space.xxl - space.lg },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
});
