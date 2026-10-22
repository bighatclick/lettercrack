/**
 * Fills missing or wrong-typed fields from defaults without dropping anything that is valid.
 * Open maps (defaults `{}`) such as `solved` and `inProgress` are kept as-is.
 * Returns the list of paths that had to be repaired so the caller can report them.
 */
export function fillDefaults<T>(defaults: T, value: unknown, path = '', repaired: string[] = []): T {
  if (Array.isArray(defaults)) {
    if (Array.isArray(value)) return value as T;
    repaired.push(path || '<root>');
    return defaults;
  }
  if (defaults !== null && typeof defaults === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      repaired.push(path || '<root>');
      return defaults;
    }
    const d = defaults as Record<string, unknown>;
    const v = value as Record<string, unknown>;
    if (Object.keys(d).length === 0) return value as T; // open map
    const out: Record<string, unknown> = { ...v };
    for (const k of Object.keys(d)) {
      out[k] = fillDefaults(d[k], v[k], path ? `${path}.${k}` : k, repaired);
    }
    return out as T;
  }
  if (defaults === null) {
    // Nullable leaf (e.g. freeUsedDate): accept null or any primitive already stored.
    return (value === undefined ? null : value) as T;
  }
  if (typeof value === typeof defaults) return value as T;
  repaired.push(path);
  return defaults;
}
