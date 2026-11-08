import type { Migration } from './index';

/**
 * v3 → v4: adds badges and Inky's outfit. Badges a player already qualifies for are awarded on
 * the next launch (from their existing progress), so nothing is lost by having started early.
 * Inky keeps the monocle he has always worn.
 */
export const v3_to_v4: Migration = (old) => ({
  ...old,
  awards: { earned: {}, seen: [] },
  outfit: { hat: null, face: 'monocle', neck: null, bg: null },
});
