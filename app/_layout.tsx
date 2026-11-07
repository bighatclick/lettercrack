import { IcloudKv } from '@modules/icloud-kv';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
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
import { syncReminders } from '@/lib/reminderSync';
import { initCrashReporting } from '@/lib/sentry';
import { startCloudSync } from '@/sync/cloud';
import { fontAssets, ThemeProvider, useTheme } from '@/ui';

initCrashReporting();
SplashScreen.preventAutoHideAsync();
initI18n();
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

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
    const onActive = () => {
      useAppStore.getState().update((r) => onAppOpen(r, today()));
      syncReminders(i18n.t.bind(i18n));
    };
    onActive();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && onActive());
    // iCloud KV sync (iOS only; a no-op elsewhere). Merge never removes local progress.
    const stopSync = startCloudSync(IcloudKv, {
      getRoot: () => useAppStore.getState().root,
      update: (fn) => useAppStore.getState().update(fn),
      subscribe: (cb) => useAppStore.subscribe((s) => cb(s.root)),
    });
    return () => {
      sub.remove();
      stopSync();
    };
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
