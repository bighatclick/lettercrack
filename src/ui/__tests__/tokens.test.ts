import { contrastRatio } from '../contrast';
import { resolvePaletteName } from '../theme';
import { gradients, hueSets, palettes } from '../tokens';

const opaque = (c: string) => /^#[0-9a-f]{6}$/i.test(c);

describe('Inky Pop palettes', () => {
  it.each(Object.entries(palettes))('%s: text colours meet WCAG contrast', (_name, p) => {
    // Body text at AAA (7:1) on both background and surface.
    expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.ink, p.surfaceRaised)).toBeGreaterThanOrEqual(7);
    // Secondary text, givens and primary-coloured labels at AA (4.5:1).
    expect(contrastRatio(p.inkMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.inkMuted, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.given, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    // The selected cell: guess letter on sunny yellow.
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.conflict, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(hueSets))('%s: every hue is readable', (name, hues) => {
    const p = palettes[name as keyof typeof palettes];
    expect(hues.map((h) => h.name)).toEqual(['coral', 'sunny', 'teal', 'sky', 'violet', 'pink']);
    for (const h of hues) {
      // Filled tile: guess letter on the bright fill.
      expect({ hue: h.name, ok: contrastRatio(h.on, h.solid) >= 4.5 }).toEqual({ hue: h.name, ok: true });
      // Empty tile and cipher letters: deep shade on the tint, the page and the board.
      expect({ hue: h.name, ok: contrastRatio(h.deep, h.tint) >= 4.5 }).toEqual({ hue: h.name, ok: true });
      expect({ hue: h.name, ok: contrastRatio(h.deep, p.surface) >= 4.5 }).toEqual({ hue: h.name, ok: true });
      // Text typed into an empty tile is `ink` on the tint.
      expect({ hue: h.name, ok: contrastRatio(p.ink, h.tint) >= 4.5 }).toEqual({ hue: h.name, ok: true });
    }
  });

  it('gradient text reads on every stop', () => {
    for (const [name, g] of Object.entries(gradients)) {
      for (const stop of g.colors) {
        expect({ name, stop, ok: contrastRatio(g.text, stop) >= 3 }).toEqual({ name, stop, ok: true });
      }
    }
  });

  it('uses opaque #RRGGBB colours everywhere contrast is checked', () => {
    for (const p of Object.values(palettes)) {
      for (const [k, v] of Object.entries(p)) if (k !== 'conflictFill') expect(opaque(v)).toBe(true);
    }
  });

  it('keeps the spec colours exactly (specs.md §10)', () => {
    expect(palettes.light).toMatchObject({ bg: '#FFF8EC', surface: '#FFFFFF', ink: '#1E1B3A', primary: '#6D3FE0', accent: '#FFC93C' });
    expect(palettes.dark).toMatchObject({ bg: '#14112B', surface: '#1F1B3D', ink: '#F4F1FF', primary: '#A98BFF' });
  });

  it('resolves appearance + high contrast to a palette', () => {
    expect(resolvePaletteName('system', 'dark', false)).toBe('dark');
    expect(resolvePaletteName('system', null, false)).toBe('light');
    expect(resolvePaletteName('light', 'dark', false)).toBe('light');
    expect(resolvePaletteName('dark', 'light', true)).toBe('darkHighContrast');
    expect(resolvePaletteName('system', 'light', true)).toBe('lightHighContrast');
  });
});
