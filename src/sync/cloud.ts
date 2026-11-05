/**
 * Runs iCloud KV sync against the app store. The native module is optional: without it
 * (Android, web, Expo Go, tests) `startCloudSync` returns a no-op.
 * Failures are reported and ignored; sync never blocks play or touches the local save on error.
 */
import type { Root } from '@/data/schema';
import { reporter } from '@/lib/report';

import { CLOUD_KEY, mergeCloud, parseCloud, toCloud } from './merge';

export type CloudKV = {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  addListener(event: 'onChange', cb: () => void): { remove(): void };
};

export type SyncTarget = {
  getRoot(): Root | null;
  /** Replace the root (already persisted by the caller's update path). */
  update(fn: (r: Root) => Root): void;
  subscribe(cb: (root: Root | null) => void): () => void;
};

const WRITE_DELAY_MS = 3000;

export function startCloudSync(kv: CloudKV | null, target: SyncTarget): () => void {
  if (!kv) return () => {};
  let lastWritten = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pull = () => {
    try {
      const doc = parseCloud(kv.getString(CLOUD_KEY));
      if (doc) target.update((r) => mergeCloud(r, doc));
    } catch (e) {
      reporter().warn('cloud pull failed', { e: String(e) });
    }
  };
  const push = () => {
    timer = null;
    const root = target.getRoot();
    if (!root) return;
    try {
      const value = JSON.stringify(toCloud(root));
      if (value === lastWritten) return;
      kv.setString(CLOUD_KEY, value);
      lastWritten = value;
    } catch (e) {
      reporter().warn('cloud push failed', { e: String(e) });
    }
  };

  pull();
  push();
  const sub = kv.addListener('onChange', pull);
  const unsub = target.subscribe(() => {
    if (!timer) timer = setTimeout(push, WRITE_DELAY_MS);
  });
  return () => {
    sub.remove();
    unsub();
    if (timer) clearTimeout(timer);
  };
}
