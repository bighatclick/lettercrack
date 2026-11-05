/**
 * Compact set of quote IDs for the iCloud key-value store (1 MB total limit): bit i set = ID i.
 * Encoded as base64 so it is a plain string value. Pure, no React Native imports.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeIdSet(ids: Iterable<number>): string {
  let max = -1;
  const list: number[] = [];
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 0) continue;
    list.push(id);
    if (id > max) max = id;
  }
  if (max < 0) return '';
  const bytes = new Uint8Array((max >> 3) + 1);
  for (const id of list) bytes[id >> 3]! |= 1 << (id & 7);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=';
    out += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return out;
}

export function decodeIdSet(s: string): number[] {
  if (!s) return [];
  const clean = s.replace(/=+$/, '');
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('invalid bitset encoding');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  const out: number[] = [];
  bytes.forEach((byte, i) => {
    for (let b = 0; b < 8; b++) if (byte & (1 << b)) out.push(i * 8 + b);
  });
  return out;
}
