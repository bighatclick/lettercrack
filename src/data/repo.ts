import type { Reporter } from '@/lib/report';

import type { KV } from './kv';
import { MigrationError, type MigrationRegistry, migrations as defaultMigrations, runMigrations } from './migrations';
import { fillDefaults } from './normalize';
import { CURRENT_SCHEMA_VERSION, defaultRoot, type Root } from './schema';

export const ROOT_KEY = 'root';
export const backupKey = (version: number) => `root.backup.v${version}`;
export const corruptKey = (now: number) => `root.corrupt.${now}`;
/** The latest good save, kept in the backup store (a separate file) and updated on every save. */
export const LAST_GOOD_KEY = 'root.lastGood';

const backupStore = (kv: KV): KV => kv.backup ?? kv;

/**
 * - `fresh`: first launch.
 * - `ok`: loaded (and migrated, if needed).
 * - `recoveredFromBackup`: the main blob was unreadable or missing; the latest good copy (or, failing
 *   that, a pre-migration backup) was used.
 * - `migrationFailed` / `newerSchema`: stored data is kept untouched; this session is read-only.
 * - `unreadable`: nothing usable; the bad blob was set aside under a corrupt key, never deleted.
 */
export type LoadStatus = 'fresh' | 'ok' | 'recoveredFromBackup' | 'migrationFailed' | 'newerSchema' | 'unreadable';

export type LoadResult = {
  state: Root;
  status: LoadStatus;
  /** When true, save() must not write: the stored blob is the only good copy of the player's data. */
  readOnly: boolean;
};

type Deps = {
  kv: KV;
  now: () => number;
  report: Reporter;
  /** Overridable for tests only. */
  registry?: MigrationRegistry;
  currentVersion?: number;
};

function parse(raw: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(raw);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type Upgrade = { ok: true; state: Root } | { ok: false; reason: 'newer' | 'failed' | 'invalid' };

/** Brings a parsed blob to the current schema. Writes a backup of the raw blob before migrating. */
function upgrade(blob: Record<string, unknown>, raw: string, deps: Deps): Upgrade {
  const target = deps.currentVersion ?? CURRENT_SCHEMA_VERSION;
  const version = blob.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { ok: false, reason: 'invalid' };
  if (version > target) return { ok: false, reason: 'newer' };

  let migrated = blob;
  if (version < target) {
    // Back up before migrating (rule 3). Keep the first backup per version; never overwrite it.
    if (deps.kv.getString(backupKey(version)) === undefined) deps.kv.set(backupKey(version), raw);
    try {
      migrated = runMigrations(blob, version, target, deps.registry ?? defaultMigrations);
    } catch (e) {
      deps.report.error(e instanceof MigrationError ? e : new MigrationError(version, e), { version });
      return { ok: false, reason: 'failed' };
    }
  }

  const repaired: string[] = [];
  const state = fillDefaults(defaultRoot(deps.now()), migrated, '', repaired);
  state.schemaVersion = CURRENT_SCHEMA_VERSION;
  if (repaired.length) deps.report.warn('Repaired fields while loading save', { repaired });
  return { ok: true, state };
}

function newestBackup(kv: KV): string | undefined {
  const keys = kv
    .getAllKeys()
    .filter((k) => k.startsWith('root.backup.v'))
    .sort((a, b) => Number(b.slice('root.backup.v'.length)) - Number(a.slice('root.backup.v'.length)));
  for (const k of keys) {
    const raw = kv.getString(k);
    if (raw !== undefined) return raw;
  }
  return undefined;
}

/** Reads a stored copy and brings it to the current schema, or null when it isn't usable. */
function restore(raw: string | undefined, deps: Deps): Root | null {
  const blob = raw !== undefined ? parse(raw) : null;
  if (!blob || raw === undefined) return null;
  const res = upgrade(blob, raw, deps);
  return res.ok ? res.state : null;
}

function keep(kv: KV, state: Root) {
  const json = JSON.stringify(state);
  kv.set(ROOT_KEY, json);
  backupStore(kv).set(LAST_GOOD_KEY, json);
}

export function load(deps: Deps): LoadResult {
  const { kv, now, report } = deps;
  const raw = kv.getString(ROOT_KEY);

  if (raw === undefined) {
    // No save in the main file. If the backup file has one, the main file was lost, not a first launch.
    const copy = restore(backupStore(kv).getString(LAST_GOOD_KEY), deps);
    if (copy) {
      report.error(new Error('Main save missing; restored the latest good copy'), {});
      keep(kv, copy);
      return { state: copy, status: 'recoveredFromBackup', readOnly: false };
    }
    const state = defaultRoot(now());
    keep(kv, state);
    return { state, status: 'fresh', readOnly: false };
  }

  const blob = parse(raw);
  if (blob) {
    const res = upgrade(blob, raw, deps);
    if (res.ok) {
      keep(kv, res.state);
      return { state: res.state, status: 'ok', readOnly: false };
    }
    if (res.reason === 'newer') {
      report.warn('Save is from a newer app version; running read-only', { version: blob.schemaVersion });
      return { state: defaultRoot(now()), status: 'newerSchema', readOnly: true };
    }
    if (res.reason === 'failed') {
      return { state: defaultRoot(now()), status: 'migrationFailed', readOnly: true };
    }
  }

  // Unparseable or structurally invalid: set it aside (never delete), then try the latest good copy,
  // then the pre-migration backups (older, so they may miss recent progress).
  kv.set(corruptKey(now()), raw);
  report.error(new Error('Unreadable save blob'), { length: raw.length });
  const copy = restore(backupStore(kv).getString(LAST_GOOD_KEY), deps) ?? restore(newestBackup(kv), deps);
  if (copy) {
    keep(kv, copy);
    return { state: copy, status: 'recoveredFromBackup', readOnly: false };
  }
  // Nothing usable. The next save replaces the latest good copy, so set that aside too (never delete).
  const lastGood = backupStore(kv).getString(LAST_GOOD_KEY);
  if (lastGood !== undefined) kv.set(`${corruptKey(now())}.lastGood`, lastGood);
  const state = defaultRoot(now());
  kv.set(ROOT_KEY, JSON.stringify(state));
  return { state, status: 'unreadable', readOnly: false };
}

export function save(kv: KV, state: Root, readOnly: boolean): boolean {
  if (readOnly) return false;
  keep(kv, state);
  return true;
}
