import { createMMKV } from 'react-native-mmkv';

import type { KV } from './kv';

function wrap(id: string): KV {
  const mmkv = createMMKV({ id });
  return {
    getString: (k) => mmkv.getString(k),
    set: (k, v) => mmkv.set(k, v),
    remove: (k) => mmkv.remove(k),
    getAllKeys: () => mmkv.getAllKeys(),
  };
}

/**
 * The app's MMKV store, plus a second MMKV file that keeps a copy of the latest good save, so a
 * damaged main file can be recovered. On Android both are in the MMKV directory, which Auto Backup includes.
 */
export function createMMKVStore(): KV {
  return { ...wrap('lettercrack'), backup: wrap('lettercrack.backup') };
}
