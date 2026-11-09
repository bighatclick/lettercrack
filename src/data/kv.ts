/**
 * Minimal synchronous key-value interface. The app uses MMKV (see mmkv.ts);
 * tests use the in-memory implementation below. Nothing outside src/data touches storage.
 */
export interface KV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
  getAllKeys(): string[];
  /**
   * A second store in a separate file, holding a copy of the latest good save. If the main file is
   * damaged or lost, the save comes back from here. Optional: without it the copy goes in the main store.
   */
  backup?: KV;
}

export function createMemoryKV(initial: Record<string, string> = {}, backup?: KV): KV & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(initial));
  return {
    backup,
    getString: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    remove: (k) => m.delete(k),
    getAllKeys: () => [...m.keys()],
    dump: () => Object.fromEntries(m),
  };
}
