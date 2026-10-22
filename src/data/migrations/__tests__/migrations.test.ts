import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createMemoryKV } from '../../kv';
import { load, ROOT_KEY } from '../../repo';
import { CURRENT_SCHEMA_VERSION, type Root } from '../../schema';
import { MigrationError, migrations, runMigrations } from '../index';

const fixturesDir = join(__dirname, '..', '__fixtures__');
const silent = { error: jest.fn(), warn: jest.fn() };

function fixtures(): { version: number; raw: string; blob: Record<string, any> }[] {
  return readdirSync(fixturesDir)
    .filter((f) => /^v\d+\.json$/.test(f))
    .map((f) => {
      const raw = readFileSync(join(fixturesDir, f), 'utf8');
      return { version: Number(f.slice(1, -5)), raw, blob: JSON.parse(raw) };
    })
    .sort((a, b) => a.version - b.version);
}

describe('migration registry (CLAUDE.md hard rule 3)', () => {
  it('has a migration for every version below the current one', () => {
    for (let v = 1; v < CURRENT_SCHEMA_VERSION; v++) {
      expect({ v, registered: typeof migrations[v] === 'function' }).toEqual({ v, registered: true });
    }
  });

  it('has a fixture for every schema version up to the current one', () => {
    const versions = fixtures().map((f) => f.version);
    for (let v = 1; v <= CURRENT_SCHEMA_VERSION; v++) expect(versions).toContain(v);
  });

  it('fixtures declare the schemaVersion matching their file name', () => {
    for (const f of fixtures()) expect(f.blob.schemaVersion).toBe(f.version);
  });
});

describe.each(fixtures())('fixture v$version → current', ({ raw, blob }) => {
  const kv = createMemoryKV({ [ROOT_KEY]: raw });
  const res = load({ kv, now: () => 1_800_000_000_000, report: silent });
  const s: Root = res.state;

  it('loads without loss', () => {
    expect(res.status).toBe('ok');
    expect(res.readOnly).toBe(false);
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('never loses a streak, best streak or solved dates', () => {
    expect(s.daily.streak).toBeGreaterThanOrEqual(blob.daily.streak);
    expect(s.daily.best).toBeGreaterThanOrEqual(blob.daily.best);
    expect(s.daily.solvedDates).toEqual(expect.arrayContaining(blob.daily.solvedDates));
  });

  it('never loses seen or solved quotes, or level progress', () => {
    expect(s.progress.seenQuoteIds).toEqual(expect.arrayContaining(blob.progress.seenQuoteIds));
    expect(Object.keys(s.progress.solved)).toEqual(expect.arrayContaining(Object.keys(blob.progress.solved)));
    expect(s.progress.levelIndex).toBeGreaterThanOrEqual(blob.progress.levelIndex);
  });

  it('never loses purchased hints or unlocks', () => {
    expect(s.hints.balance).toBeGreaterThanOrEqual(blob.hints.balance);
    expect(s.unlocks.removeAds).toBe(blob.unlocks.removeAds);
    expect(s.unlocks.packs).toEqual(expect.arrayContaining(blob.unlocks.packs));
  });

  it('keeps the puzzle in progress', () => {
    expect(Object.keys(s.inProgress)).toEqual(expect.arrayContaining(Object.keys(blob.inProgress)));
  });
});

describe('runMigrations', () => {
  it('applies steps in order and stamps each version', () => {
    const seen: number[] = [];
    const registry = {
      1: (b: Record<string, unknown>) => (seen.push(b.schemaVersion as number), { ...b, a: 1 }),
      2: (b: Record<string, unknown>) => (seen.push(b.schemaVersion as number), { ...b, b: 2 }),
    };
    const out = runMigrations({ schemaVersion: 1 }, 1, 3, registry);
    expect(seen).toEqual([1, 2]);
    expect(out).toEqual({ schemaVersion: 3, a: 1, b: 2 });
  });

  it('does not mutate its input', () => {
    const input = { schemaVersion: 1, nested: { x: 1 } };
    runMigrations(input, 1, 2, { 1: (b) => ((b.nested as { x: number }).x = 9, b) });
    expect(input.nested.x).toBe(1);
  });

  it('throws MigrationError when a step is missing', () => {
    expect(() => runMigrations({ schemaVersion: 1 }, 1, 2, {})).toThrow(MigrationError);
  });
});
