/**
 * Schema migrations. Each entry upgrades a blob from version `from` to `from + 1`.
 * Migrations must be pure: no I/O, no clock, no randomness. They receive a deep copy.
 *
 * Example for the first real change:
 *   import { v1_to_v2 } from './v1_to_v2';
 *   export const migrations: MigrationRegistry = { 1: v1_to_v2 };
 */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;
export type MigrationRegistry = Record<number, Migration>;

export const migrations: MigrationRegistry = {};

export class MigrationError extends Error {
  constructor(
    readonly fromVersion: number,
    readonly cause: unknown,
  ) {
    super(`Migration from v${fromVersion} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'MigrationError';
  }
}

export function runMigrations(
  blob: Record<string, unknown>,
  from: number,
  to: number,
  registry: MigrationRegistry = migrations,
): Record<string, unknown> {
  let current = structuredClone(blob);
  for (let v = from; v < to; v++) {
    const step = registry[v];
    if (!step) throw new MigrationError(v, new Error(`no migration registered for v${v} → v${v + 1}`));
    try {
      current = step(current);
    } catch (e) {
      throw new MigrationError(v, e);
    }
    current.schemaVersion = v + 1;
  }
  return current;
}
