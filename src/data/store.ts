import { create } from 'zustand';

import { reporter } from '@/lib/report';

import type { KV } from './kv';
import { load, type LoadStatus, save } from './repo';
import type { Root, Settings } from './schema';

type AppState = {
  ready: boolean;
  root: Root | null;
  loadStatus: LoadStatus | null;
  readOnly: boolean;
  /** Loads (and migrates) the save. Call once at startup with the MMKV store. */
  hydrate(kv: KV, now?: () => number): void;
  /** Applies a change and persists it synchronously (MMKV writes are ~µs). */
  update(fn: (draft: Root) => Root): void;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
};

let storage: KV | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  root: null,
  loadStatus: null,
  readOnly: false,
  hydrate(kv, now = Date.now) {
    storage = kv;
    const res = load({ kv, now, report: reporter() });
    const root = { ...res.state, meta: { ...res.state.meta, sessionCount: res.state.meta.sessionCount + 1 } };
    save(kv, root, res.readOnly);
    set({ ready: true, root, loadStatus: res.status, readOnly: res.readOnly });
  },
  update(fn) {
    const { root, readOnly } = get();
    if (!root || !storage) return;
    const next = fn(root);
    save(storage, next, readOnly);
    set({ root: next });
  },
  setSetting(key, value) {
    get().update((r) => ({ ...r, settings: { ...r.settings, [key]: value } }));
  },
}));
