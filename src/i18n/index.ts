import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import pseudo from './pseudo.json';

/**
 * All UI text lives in en.json (CLAUDE.md hard rule 10). Puzzle content is English-only.
 * Set EXPO_PUBLIC_PSEUDO_LOCALE=1 to render the pseudo-locale and catch hard-coded strings
 * and layouts that break with ~35% longer text.
 */
const usePseudo = process.env.EXPO_PUBLIC_PSEUDO_LOCALE === '1';

export const i18n = createInstance();

export function initI18n() {
  if (i18n.isInitialized) return i18n;
  const deviceLang = getLocales()[0]?.languageCode ?? 'en';
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, 'en-XA': { translation: pseudo } },
    lng: usePseudo ? 'en-XA' : deviceLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}
