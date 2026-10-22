import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createMMKVStore } from '@/data/mmkv';
import { useAppStore } from '@/data/store';
import { onAppOpen } from '@/game/session';
import { today } from '@/game/today';
import { i18n, initI18n } from '@/i18n';
import { fontAssets, ThemeProvider, useTheme } from '@/ui';

SplashScreen.preventAutoHideAsync();
initI18n();

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = useAppStore((s) => s.ready);
  const settings = useAppStore((s) => s.root?.settings);

  useEffect(() => {
    const store = useAppStore.getState();
    if (!store.ready) store.hydrate(createMMKVStore());
    // Remember the highest date seen, on launch and whenever the app returns to the foreground.
    const noteDate = () => useAppStore.getState().update((r) => onAppOpen(r, today()));
    noteDate();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && noteDate());
    return () => sub.remove();
  }, []);

  const loaded = (fontsLoaded || !!fontError) && ready && !!settings;

  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  if (!loaded || !settings) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ThemeProvider
          appearance={settings.appearance}
          highContrast={settings.highContrast}
          textSizeStep={settings.textSize}
        >
          <ThemedStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
