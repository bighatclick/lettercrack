import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions } from 'react-native';

import { reporter } from './report';

/** Screens at least this wide on their short side are tablets (Android's sw600dp, iPad). */
export const TABLET_MIN_DP = 600;

export const isTabletSize = (width: number, height: number) => Math.min(width, height) >= TABLET_MIN_DP;

/**
 * Phones stay in portrait: the puzzle needs the height for the board and the keyboard.
 * Tablets (and iPad, which spec R18 supports) may rotate freely, so they are never letterboxed.
 * app.json allows every orientation; this narrows it on phones at startup.
 */
export async function applyOrientationPolicy(screen = Dimensions.get('screen')): Promise<void> {
  try {
    if (isTabletSize(screen.width, screen.height)) await ScreenOrientation.unlockAsync();
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (e) {
    reporter().warn('orientation policy failed', { e: String(e) });
  }
}
