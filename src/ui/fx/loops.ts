import { E2E } from '@/config/e2e';

import { useTheme } from '../theme';

/** Pure rule behind useNoLoops, exported for tests. */
export const loopsOff = (reduceMotion: boolean, e2e: boolean) => reduceMotion || e2e;

/**
 * True when endless animations (Inky's bob, floating letters, pulses, confetti rain) must stay still:
 * under Reduce Motion, and in E2E builds. Endless loops keep Android from ever going idle, so
 * uiautomator and Maestro can't read the screen. One-off animations (entrances, the word hop) still run.
 */
export function useNoLoops(): boolean {
  const { reduceMotion } = useTheme();
  return loopsOff(reduceMotion, E2E);
}
