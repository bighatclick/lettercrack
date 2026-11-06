import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { type Hue, hueSets, type Palette, type PaletteName, palettes, type TextSizeStep, textSizeSteps } from './tokens';

export type Appearance = 'system' | 'light' | 'dark';

export type Theme = {
  name: PaletteName;
  colors: Palette;
  /** The six colour families, in order: coral, sunny, teal, sky, violet, pink. */
  hues: readonly Hue[];
  /** Hue for the n-th item (words, weekdays, bars…), cycling through the set. */
  hue: (n: number) => Hue;
  isDark: boolean;
  highContrast: boolean;
  /** Multiplier from the in-app text-size slider (OS font scale is applied on top by RN). */
  textScale: number;
  reduceMotion: boolean;
};

export function resolvePaletteName(
  appearance: Appearance,
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
  highContrast: boolean,
): PaletteName {
  const dark = appearance === 'dark' || (appearance === 'system' && systemScheme === 'dark');
  if (highContrast) return dark ? 'darkHighContrast' : 'lightHighContrast';
  return dark ? 'dark' : 'light';
}

function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

const ThemeContext = createContext<Theme | null>(null);

type ThemeProviderProps = {
  appearance: Appearance;
  highContrast: boolean;
  textSizeStep: TextSizeStep;
  children: ReactNode;
};

export function ThemeProvider({ appearance, highContrast, textSizeStep, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const reduceMotion = useReduceMotion();
  const theme = useMemo<Theme>(() => {
    const name = resolvePaletteName(appearance, systemScheme, highContrast);
    const hues = hueSets[name];
    return {
      name,
      colors: palettes[name],
      hues,
      hue: (n: number) => hues[((n % hues.length) + hues.length) % hues.length] as Hue,
      isDark: name === 'dark' || name === 'darkHighContrast',
      highContrast,
      textScale: textSizeSteps[textSizeStep],
      reduceMotion,
    };
  }, [appearance, systemScheme, highContrast, textSizeStep, reduceMotion]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}
