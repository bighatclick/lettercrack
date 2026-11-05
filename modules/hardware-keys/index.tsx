import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

/** 'A'–'Z', 'Backspace', 'ArrowLeft' or 'ArrowRight'. */
export type HardwareKey = string;

type NativeProps = { onKey: (e: { nativeEvent: { key: string } }) => void; style?: object };

const NativeView =
  Platform.OS !== 'web' && requireOptionalNativeModule('HardwareKeys') ? requireNativeView<NativeProps>('HardwareKeys') : null;

/** Maps a key name (DOM or native) to ours. */
export function normaliseKey(key: string): HardwareKey | null {
  if (key === 'Backspace' || key === 'Delete') return 'Backspace';
  if (key === 'ArrowLeft' || key === 'ArrowRight') return key;
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  return null;
}

/**
 * Renders nothing visible. While mounted, hardware keyboard letters, Delete and arrows go to
 * `onKey` (iPad and Android keyboards via the native view; desktop web via keydown).
 * Without the native module (Expo Go, tests) it does nothing.
 */
export function HardwareKeys({ onKey }: { onKey: (key: HardwareKey) => void }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = normaliseKey(e.key);
      if (k) {
        e.preventDefault();
        onKey(k);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onKey]);
  if (!NativeView) return null;
  return (
    <NativeView
      style={styles.hidden}
      onKey={(e) => {
        const k = normaliseKey(e.nativeEvent.key);
        if (k) onKey(k);
      }}
    />
  );
}

const styles = StyleSheet.create({ hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 } });
