import { createMMKV } from 'react-native-mmkv';

import type { KV } from './kv';

/** The app's single MMKV instance. On Android its directory is included in Auto Backup. */
export function createMMKVStore(): KV {
  const mmkv = createMMKV({ id: 'lettercrack' });
  return {
    getString: (k) => mmkv.getString(k),
    set: (k, v) => mmkv.set(k, v),
    remove: (k) => mmkv.remove(k),
    getAllKeys: () => mmkv.getAllKeys(),
  };
}
