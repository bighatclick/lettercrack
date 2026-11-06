/** Darker shade of a #RRGGBB colour, for the 3D bottom edge of tiles and buttons. */
export function shade(hex: string, factor = 0.78): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}
