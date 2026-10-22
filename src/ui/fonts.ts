// Per-weight imports so only the faces we use are bundled. All three families are SIL OFL 1.1.
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { LibreBaskerville_400Regular } from '@expo-google-fonts/libre-baskerville/400Regular';
import { LibreBaskerville_400Regular_Italic } from '@expo-google-fonts/libre-baskerville/400Regular_Italic';
import { LibreBaskerville_700Bold } from '@expo-google-fonts/libre-baskerville/700Bold';

import { fontFamily } from './tokens';

export const fontAssets = {
  [fontFamily.serif]: LibreBaskerville_400Regular,
  [fontFamily.serifItalic]: LibreBaskerville_400Regular_Italic,
  [fontFamily.serifBold]: LibreBaskerville_700Bold,
  [fontFamily.mono]: IBMPlexMono_600SemiBold,
  [fontFamily.sans]: IBMPlexSans_400Regular,
  [fontFamily.sansSemiBold]: IBMPlexSans_600SemiBold,
};
