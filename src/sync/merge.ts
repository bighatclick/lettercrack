/**
 * iCloud key-value sync (specs.md §9). Pure: builds the cloud document from a Root and merges a
 * cloud document back in. Rules: union for sets, max for counters and streak, last-write for
 * settings, hints balance = max(local, cloud). A merge never removes anything from local.
 */
import type { Root, Settings, SolvedRecord } from '@/data/schema';
import { mergeHints } from '@/engine/hints';

import { decodeIdSet, encodeIdSet } from './bitset';

export const CLOUD_KEY = 'lettercrack.sync.v1';
/** Keep the document well under the 1 MB iCloud KV limit. */
const MAX_SOLVED_DATES = 400;

export type CloudDoc = {
  v: 1;
  seen: string;
  reported: string;
  solved: Record<string, SolvedRecord>;
  levelIndex: number;
  daily: Root['daily'];
  hints: Root['hints'];
  unlocks: Root['unlocks'];
  settings: Settings;
  settingsUpdatedAt: number;
};

export function toCloud(root: Root): CloudDoc {
  return {
    v: 1,
    seen: encodeIdSet(root.progress.seenQuoteIds),
    reported: encodeIdSet(root.progress.reportedQuoteIds),
    solved: root.progress.solved,
    levelIndex: root.progress.levelIndex,
    daily: { ...root.daily, solvedDates: [...root.daily.solvedDates].sort().slice(-MAX_SOLVED_DATES) },
    hints: root.hints,
    unlocks: root.unlocks,
    settings: root.settings,
    settingsUpdatedAt: root.meta.settingsUpdatedAt,
  };
}

/** Parses a stored cloud value. Anything unexpected → null (sync is skipped, never fatal). */
export function parseCloud(raw: string | null | undefined): CloudDoc | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<CloudDoc>;
    if (d.v !== 1 || typeof d.seen !== 'string' || !d.daily || !d.hints || !d.unlocks || !d.settings) return null;
    decodeIdSet(d.seen);
    decodeIdSet(d.reported ?? '');
    return { reported: '', solved: {}, levelIndex: 0, settingsUpdatedAt: 0, ...d } as CloudDoc;
  } catch {
    return null;
  }
}

const union = (a: readonly number[], b: readonly number[]) => [...new Set([...a, ...b])];
const maxStr = (a: string | null, b: string | null) => ((a ?? '') >= (b ?? '') ? a : b);

export function mergeCloud(local: Root, cloud: CloudDoc): Root {
  const solved: Record<string, SolvedRecord> = { ...local.progress.solved };
  for (const [id, rec] of Object.entries(cloud.solved)) {
    const mine = solved[id];
    if (!mine || rec.date > mine.date) solved[id] = rec;
  }
  const solvedDates = [...new Set([...local.daily.solvedDates, ...cloud.daily.solvedDates])].sort();
  const cloudSettingsNewer = cloud.settingsUpdatedAt > local.meta.settingsUpdatedAt;
  return {
    ...local,
    settings: cloudSettingsNewer ? { ...local.settings, ...cloud.settings } : local.settings,
    progress: {
      ...local.progress,
      levelIndex: Math.max(local.progress.levelIndex, cloud.levelIndex),
      seenQuoteIds: union(local.progress.seenQuoteIds, decodeIdSet(cloud.seen)),
      reportedQuoteIds: union(local.progress.reportedQuoteIds, decodeIdSet(cloud.reported)),
      solved,
    },
    daily: {
      streak: Math.max(local.daily.streak, cloud.daily.streak),
      best: Math.max(local.daily.best, cloud.daily.best, local.daily.streak, cloud.daily.streak),
      freezeUsedWeek: maxStr(local.daily.freezeUsedWeek, cloud.daily.freezeUsedWeek),
      solvedDates,
      highestDateSeen: maxStr(local.daily.highestDateSeen, cloud.daily.highestDateSeen),
    },
    hints: mergeHints(local.hints, cloud.hints),
    unlocks: {
      removeAds: local.unlocks.removeAds || cloud.unlocks.removeAds,
      packs: [...new Set([...local.unlocks.packs, ...cloud.unlocks.packs])],
    },
    meta: { ...local.meta, settingsUpdatedAt: Math.max(local.meta.settingsUpdatedAt, cloud.settingsUpdatedAt) },
  };
}
