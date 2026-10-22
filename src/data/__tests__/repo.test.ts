import { createMemoryKV } from '../kv';
import { backupKey, load, ROOT_KEY, save } from '../repo';
import { defaultRoot } from '../schema';

const NOW = 1_800_000_000_000;
const now = () => NOW;
const mkReport = () => ({ error: jest.fn(), warn: jest.fn() });

describe('repo.load', () => {
  it('creates and persists defaults on first launch', () => {
    const kv = createMemoryKV();
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('fresh');
    expect(res.state).toEqual(defaultRoot(NOW));
    expect(JSON.parse(kv.getString(ROOT_KEY)!)).toEqual(defaultRoot(NOW));
  });

  it('round-trips a saved state exactly', () => {
    const kv = createMemoryKV();
    const state = defaultRoot(NOW);
    state.daily.streak = 12;
    state.hints.balance = 50;
    state.progress.seenQuoteIds = [1, 2, 3];
    save(kv, state, false);
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('ok');
    expect(res.state).toEqual(state);
  });

  it('repairs missing or wrong-typed fields without dropping valid ones', () => {
    const blob: any = defaultRoot(NOW);
    delete blob.settings.autoFill;
    blob.daily.streak = 'seven';
    blob.daily.best = 9;
    blob.progress.solved = { '5': { date: '2026-11-01', clean: true, timeMs: null, difficulty: 'easy' } };
    const kv = createMemoryKV({ [ROOT_KEY]: JSON.stringify(blob) });
    const report = mkReport();
    const res = load({ kv, now, report });
    expect(res.state.settings.autoFill).toBe(true);
    expect(res.state.daily.streak).toBe(0);
    expect(res.state.daily.best).toBe(9);
    expect(res.state.progress.solved['5']).toBeDefined();
    expect(report.warn).toHaveBeenCalled();
  });

  it('backs up the raw blob before migrating, and keeps the first backup', () => {
    const v1 = JSON.stringify({ ...defaultRoot(NOW), schemaVersion: 1 });
    const kv = createMemoryKV({ [ROOT_KEY]: v1 });
    const registry = { 1: (b: Record<string, unknown>) => ({ ...b, added: true }) };
    const res = load({ kv, now, report: mkReport(), registry, currentVersion: 2 });
    expect(res.status).toBe('ok');
    expect(kv.getString(backupKey(1))).toBe(v1);

    // A later load from another v1 blob must not overwrite the original backup.
    kv.set(ROOT_KEY, JSON.stringify({ ...defaultRoot(NOW), schemaVersion: 1, other: 1 }));
    load({ kv, now, report: mkReport(), registry, currentVersion: 2 });
    expect(kv.getString(backupKey(1))).toBe(v1);
  });

  it('on migration failure: keeps the old data untouched, reports, and goes read-only', () => {
    const v1 = JSON.stringify({ ...defaultRoot(NOW), schemaVersion: 1, daily: { streak: 40, best: 40 } });
    const kv = createMemoryKV({ [ROOT_KEY]: v1 });
    const report = mkReport();
    const registry = {
      1: () => {
        throw new Error('boom');
      },
    };
    const res = load({ kv, now, report, registry, currentVersion: 2 });
    expect(res.status).toBe('migrationFailed');
    expect(res.readOnly).toBe(true);
    expect(kv.getString(ROOT_KEY)).toBe(v1);
    expect(kv.getString(backupKey(1))).toBe(v1);
    expect(report.error).toHaveBeenCalled();
    expect(save(kv, res.state, res.readOnly)).toBe(false);
    expect(kv.getString(ROOT_KEY)).toBe(v1);
  });

  it('never overwrites a save from a newer app version', () => {
    const future = JSON.stringify({ schemaVersion: 99, daily: { streak: 500 } });
    const kv = createMemoryKV({ [ROOT_KEY]: future });
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('newerSchema');
    expect(res.readOnly).toBe(true);
    expect(kv.getString(ROOT_KEY)).toBe(future);
  });

  it('sets unreadable data aside instead of deleting it', () => {
    const kv = createMemoryKV({ [ROOT_KEY]: '{"schemaVersion": 1, "daily": ' });
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('unreadable');
    expect(kv.getString(`root.corrupt.${NOW}`)).toBe('{"schemaVersion": 1, "daily": ');
    expect(res.state).toEqual(defaultRoot(NOW));
  });

  it('recovers from the newest backup when the main blob is unreadable', () => {
    const good = { ...defaultRoot(NOW), daily: { streak: 21, best: 30, freezeUsedWeek: null, solvedDates: [] } };
    const kv = createMemoryKV({ [ROOT_KEY]: 'garbage', [backupKey(1)]: JSON.stringify(good) });
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('recoveredFromBackup');
    expect(res.state.daily.streak).toBe(21);
    expect(kv.getString(`root.corrupt.${NOW}`)).toBe('garbage');
  });

  it('treats a blob without a valid schemaVersion as unreadable, never as empty', () => {
    const kv = createMemoryKV({ [ROOT_KEY]: JSON.stringify({ daily: { streak: 3 } }) });
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('unreadable');
    expect(kv.getString(`root.corrupt.${NOW}`)).toContain('"streak":3');
  });
});
