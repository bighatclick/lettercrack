import { createMemoryKV } from '../kv';
import { backupKey, LAST_GOOD_KEY, load, ROOT_KEY, save } from '../repo';
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

// E2E 14.7: a damaged or lost main save comes back with all recent progress, from the copy kept in
// a separate file. The pre-migration backup alone would bring back only the state from the last upgrade.
describe('latest good copy', () => {
  const played = () => {
    const s = defaultRoot(NOW);
    s.daily.streak = 9;
    s.daily.best = 14;
    s.hints.balance = 6;
    s.progress.seenQuoteIds = [4, 8, 15];
    s.awards.earned = { firstCrack: '2027-02-01' };
    s.outfit.hat = 'topHat';
    s.goals = { date: '2027-02-18', progress: { solveAny: 1 }, rewarded: false };
    return s;
  };

  it('save() writes the copy to the backup store, not only the main one', () => {
    const backup = createMemoryKV();
    const kv = createMemoryKV({}, backup);
    save(kv, played(), false);
    expect(JSON.parse(backup.getString(LAST_GOOD_KEY)!)).toEqual(played());
  });

  it('a read-only session never writes the copy', () => {
    const backup = createMemoryKV();
    expect(save(createMemoryKV({}, backup), played(), true)).toBe(false);
    expect(backup.getString(LAST_GOOD_KEY)).toBeUndefined();
  });

  it('restores everything from the copy when the main blob is junk, ahead of an older pre-migration backup', () => {
    const old = { ...defaultRoot(NOW), schemaVersion: 1, daily: { streak: 2, best: 2, freezeUsedWeek: null, solvedDates: [] } };
    const backup = createMemoryKV({ [LAST_GOOD_KEY]: JSON.stringify(played()) });
    const kv = createMemoryKV({ [ROOT_KEY]: '\u0000junk', [backupKey(1)]: JSON.stringify(old) }, backup);
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('recoveredFromBackup');
    expect(res.state).toEqual(played());
    expect(JSON.parse(kv.getString(ROOT_KEY)!)).toEqual(played());
    expect(kv.getString(`root.corrupt.${NOW}`)).toBe('\u0000junk');
  });

  it('restores from the copy when the main file is gone (MMKV reset it), instead of starting fresh', () => {
    const backup = createMemoryKV({ [LAST_GOOD_KEY]: JSON.stringify(played()) });
    const report = mkReport();
    const res = load({ kv: createMemoryKV({}, backup), now, report });
    expect(res.status).toBe('recoveredFromBackup');
    expect(res.state).toEqual(played());
    expect(report.error).toHaveBeenCalled();
  });

  it('a true first launch (both stores empty) is still fresh', () => {
    const backup = createMemoryKV();
    const res = load({ kv: createMemoryKV({}, backup), now, report: mkReport() });
    expect(res.status).toBe('fresh');
    expect(JSON.parse(backup.getString(LAST_GOOD_KEY)!)).toEqual(defaultRoot(NOW));
  });

  it('falls back to the pre-migration backup when the copy is junk too', () => {
    const good = { ...defaultRoot(NOW), daily: { streak: 21, best: 30, freezeUsedWeek: null, solvedDates: [] } };
    const backup = createMemoryKV({ [LAST_GOOD_KEY]: 'junk' });
    const kv = createMemoryKV({ [ROOT_KEY]: 'garbage', [backupKey(1)]: JSON.stringify(good) }, backup);
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('recoveredFromBackup');
    expect(res.state.daily.streak).toBe(21);
  });

  it('with nothing usable, sets the unusable copy aside before it gets replaced', () => {
    const backup = createMemoryKV({ [LAST_GOOD_KEY]: 'junk copy' });
    const kv = createMemoryKV({ [ROOT_KEY]: 'garbage' }, backup);
    const res = load({ kv, now, report: mkReport() });
    expect(res.status).toBe('unreadable');
    expect(kv.getString(`root.corrupt.${NOW}`)).toBe('garbage');
    expect(kv.getString(`root.corrupt.${NOW}.lastGood`)).toBe('junk copy');
  });
});
