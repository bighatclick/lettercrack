import { defaultRoot, type Root } from '@/data/schema';
import { createRng, randInt } from '@/engine/rng';

import { decodeIdSet, encodeIdSet } from '../bitset';
import { startCloudSync } from '../cloud';
import { CLOUD_KEY, mergeCloud, parseCloud, toCloud } from '../merge';

const NOW = 1_800_000_000_000;

describe('id bitset', () => {
  it('round-trips random sets', () => {
    const rng = createRng('bitset');
    for (let n = 0; n < 300; n++) {
      const ids = new Set<number>();
      const size = randInt(rng, 201);
      for (let i = 0; i < size; i++) ids.add(randInt(rng, 3001));
      expect(decodeIdSet(encodeIdSet(ids))).toEqual([...ids].sort((a, b) => a - b));
    }
  });

  it('is compact: 1,500 seen quotes fit in ~250 characters', () => {
    const ids = Array.from({ length: 1500 }, (_, i) => i + 1);
    expect(encodeIdSet(ids).length).toBeLessThan(260);
  });

  it('ignores invalid ids and rejects bad input', () => {
    expect(decodeIdSet(encodeIdSet([-1, 1.5, 3]))).toEqual([3]);
    expect(decodeIdSet('')).toEqual([]);
    expect(() => decodeIdSet('!!')).toThrow();
  });
});

function played(): Root {
  const r = defaultRoot(NOW);
  r.progress.seenQuoteIds = [1, 2, 3];
  r.progress.solved = { 1: { date: '2027-01-01', clean: true, timeMs: null, difficulty: 'easy' } };
  r.progress.levelIndex = 3;
  r.daily = { streak: 4, best: 9, freezeUsedWeek: '2027-W01', solvedDates: ['2027-01-03', '2027-01-04'], highestDateSeen: '2027-01-04', bonusFreezes: 1, milestonesAwarded: [7] };
  r.hints.balance = 12;
  return r;
}

describe('cloud merge (§9)', () => {
  it('never loses anything from either side', () => {
    const local = played();
    const other = played();
    other.progress.seenQuoteIds = [3, 4, 5];
    other.progress.solved = { 5: { date: '2027-01-05', clean: false, timeMs: 1000, difficulty: 'hard' } };
    other.progress.levelIndex = 7;
    other.progress.reportedQuoteIds = [9];
    other.daily = { streak: 6, best: 6, freezeUsedWeek: '2027-W02', solvedDates: ['2027-01-05'], highestDateSeen: '2027-01-05', bonusFreezes: 0, milestonesAwarded: [7, 30] };
    other.hints.balance = 50;
    other.unlocks = { removeAds: true, packs: ['bard'] };

    const m = mergeCloud(local, parseCloud(JSON.stringify(toCloud(other)))!);
    expect(m.progress.seenQuoteIds.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(Object.keys(m.progress.solved).sort()).toEqual(['1', '5']);
    expect(m.progress.levelIndex).toBe(7);
    expect(m.progress.reportedQuoteIds).toEqual([9]);
    expect(m.daily.streak).toBe(6);
    expect(m.daily.best).toBe(9);
    expect(m.daily.solvedDates).toEqual(['2027-01-03', '2027-01-04', '2027-01-05']);
    expect(m.daily.freezeUsedWeek).toBe('2027-W02');
    expect(m.daily.bonusFreezes).toBe(1);
    expect(m.daily.milestonesAwarded).toEqual([7, 30]);
    expect(m.hints.balance).toBe(50);
    expect(m.unlocks).toEqual({ removeAds: true, packs: ['bard'] });
  });

  it('settings: last write wins', () => {
    const local = played();
    local.settings.textSize = 2;
    local.meta.settingsUpdatedAt = 100;
    const cloud = toCloud({ ...played(), settings: { ...local.settings, textSize: 3 }, meta: { ...local.meta, settingsUpdatedAt: 50 } });
    expect(mergeCloud(local, cloud).settings.textSize).toBe(2);
    expect(mergeCloud(local, { ...cloud, settingsUpdatedAt: 200 }).settings.textSize).toBe(3);
  });

  it('is idempotent and keeps the hints balance at max(local, cloud)', () => {
    const local = played();
    const doc = toCloud(local);
    const once = mergeCloud(local, doc);
    expect(mergeCloud(once, doc)).toEqual(once);
    expect(mergeCloud({ ...local, hints: { ...local.hints, balance: 3 } }, doc).hints.balance).toBe(12);
  });

  it('rejects garbage', () => {
    expect(parseCloud(null)).toBeNull();
    expect(parseCloud('{')).toBeNull();
    expect(parseCloud('{"v":2}')).toBeNull();
    expect(parseCloud(JSON.stringify({ ...toCloud(played()), seen: '!!' }))).toBeNull();
  });
});

describe('startCloudSync', () => {
  function harness(initialCloud: string | null) {
    let root: Root | null = played();
    const subs: ((r: Root | null) => void)[] = [];
    const listeners: (() => void)[] = [];
    const store = new Map<string, string>();
    if (initialCloud) store.set(CLOUD_KEY, initialCloud);
    const kv = {
      getString: (k: string) => store.get(k) ?? null,
      setString: jest.fn((k: string, v: string) => void store.set(k, v)),
      addListener: (_: 'onChange', cb: () => void) => (listeners.push(cb), { remove: jest.fn() }),
    };
    const target = {
      getRoot: () => root,
      update: (fn: (r: Root) => Root) => {
        root = fn(root!);
        subs.forEach((s) => s(root));
      },
      subscribe: (cb: (r: Root | null) => void) => (subs.push(cb), () => {}),
    };
    return { kv, target, store, listeners, root: () => root! };
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is a no-op without the native module', () => {
    expect(() => startCloudSync(null, harness(null).target)()).not.toThrow();
  });

  it('pulls and merges on start, pushes the merged result, and re-pulls on external change', () => {
    const remote = played();
    remote.hints.balance = 99;
    const h = harness(JSON.stringify(toCloud(remote)));
    const stop = startCloudSync(h.kv, h.target);
    expect(h.root().hints.balance).toBe(99);
    expect(parseCloud(h.store.get(CLOUD_KEY))!.hints.balance).toBe(99);

    const later = played();
    later.daily.best = 40;
    h.store.set(CLOUD_KEY, JSON.stringify(toCloud(later)));
    h.listeners.forEach((l) => l());
    expect(h.root().daily.best).toBe(40);
    stop();
  });

  it('debounces pushes after local changes', () => {
    const h = harness(null);
    startCloudSync(h.kv, h.target);
    const writes = h.kv.setString.mock.calls.length;
    h.target.update((r) => ({ ...r, progress: { ...r.progress, levelIndex: 50 } }));
    h.target.update((r) => ({ ...r, progress: { ...r.progress, levelIndex: 51 } }));
    expect(h.kv.setString.mock.calls.length).toBe(writes);
    jest.advanceTimersByTime(3000);
    expect(h.kv.setString.mock.calls.length).toBe(writes + 1);
    expect(parseCloud(h.store.get(CLOUD_KEY))!.levelIndex).toBe(51);
  });

  it('survives a throwing store', () => {
    const h = harness(null);
    h.kv.getString = () => {
      throw new Error('iCloud unavailable');
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => startCloudSync(h.kv, h.target)).not.toThrow();
    warn.mockRestore();
  });
});
