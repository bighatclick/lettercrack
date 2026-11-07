import type { Migration } from './index';

/**
 * v1 → v2: adds meta.onboardedAt and meta.settingsUpdatedAt.
 * Anyone who has already played (seen, solved or in progress) counts as onboarded at install time.
 */
export const v1_to_v2: Migration = (old) => {
  const progress = (old.progress ?? {}) as { seenQuoteIds?: unknown[]; solved?: Record<string, unknown> };
  const inProgress = (old.inProgress ?? {}) as Record<string, unknown>;
  const played =
    (progress.seenQuoteIds?.length ?? 0) > 0 ||
    Object.keys(progress.solved ?? {}).length > 0 ||
    Object.keys(inProgress).length > 0;
  const meta = (old.meta ?? {}) as Record<string, unknown>;
  const installedAt = typeof old.installedAt === 'number' ? old.installedAt : 0;
  return {
    ...old,
    meta: { ...meta, onboardedAt: played ? installedAt : null, settingsUpdatedAt: 0 },
  };
};
