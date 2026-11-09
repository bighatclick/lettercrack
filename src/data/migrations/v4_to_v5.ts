import type { Migration } from './index';

/**
 * v4 → v5: archive days solved later are now recorded (progress.lateDailies). Older saves never
 * recorded them, so the old rule (a solve record dated on or after the day) keeps applying to
 * solves up to the last date this save had seen. Nothing that showed as solved stops being solved.
 */
export const v4_to_v5: Migration = (old) => {
  const progress = (old.progress ?? {}) as Record<string, unknown>;
  const daily = (old.daily ?? {}) as Record<string, unknown>;
  const solved = (progress.solved ?? {}) as Record<string, { date?: unknown }>;
  // The cutoff: the highest date seen, or failing that the newest solve record.
  let cutoff = typeof daily.highestDateSeen === 'string' ? daily.highestDateSeen : null;
  for (const rec of Object.values(solved)) {
    if (typeof rec?.date === 'string' && (cutoff === null || rec.date > cutoff)) cutoff = rec.date;
  }
  return { ...old, progress: { ...progress, lateDailies: [], legacyDailyCutoff: cutoff } };
};
