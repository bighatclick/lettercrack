// Per-weight imports so only the faces we use are bundled. All four families are SIL OFL 1.1.
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { LibreBaskerville_400Regular } from '@expo-google-fonts/libre-baskerville/400Regular';
import { LibreBaskerville_400Regular_Italic } from '@expo-google-fonts/libre-baskerville/400Regular_Italic';
import { LibreBaskerville_700Bold } from '@expo-google-fonts/libre-baskerville/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';

import { fontFamily } from './tokens';

export const fontAssets = {
  [fontFamily.serif]: LibreBaskerville_400Regular,
  [fontFamily.serifItalic]: LibreBaskerville_400Regular_Italic,
  [fontFamily.serifBold]: LibreBaskerville_700Bold,
  [fontFamily.mono]: IBMPlexMono_600SemiBold,
  [fontFamily.sans]: Nunito_600SemiBold,
  [fontFamily.sansBold]: Nunito_700Bold,
  [fontFamily.sansSemiBold]: Nunito_800ExtraBold,
  [fontFamily.sansBlack]: Nunito_900Black,
};
