/**
 * Minimal synchronous key-value interface. The app uses MMKV (see mmkv.ts);
 * tests use the in-memory implementation below. Nothing outside src/data touches storage.
 */
export interface KV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
  getAllKeys(): string[];
}

export function createMemoryKV(initial: Record<string, string> = {}): KV & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(initial));
  return {
    getString: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    remove: (k) => m.delete(k),
    getAllKeys: () => [...m.keys()],
    dump: () => Object.fromEntries(m),
  };
}
