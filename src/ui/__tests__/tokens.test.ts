import { contrastRatio } from '../contrast';
import { resolvePaletteName } from '../theme';
import { palettes } from '../tokens';

describe('Ink & Parchment palettes', () => {
  it.each(Object.entries(palettes))('%s: text colours meet WCAG contrast', (_name, p) => {
    // Body text at AAA (7:1) on both background and surface.
    expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(7);
    // Secondary text, givens and primary-coloured labels at AA (4.5:1).
    expect(contrastRatio(p.inkMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.given, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the spec colours exactly (specs.md §10)', () => {
    expect(palettes.light).toMatchObject({
      bg: '#F4EEDF',
      surface: '#FFFBF2',
      ink: '#1E2A44',
      primary: '#8C2F39',
      accent: '#D4A017',
      given: '#5B6B8C',
      conflict: '#C0392B',
    });
    expect(palettes.dark).toMatchObject({
      bg: '#12161F',
      surface: '#1B2130',
      ink: '#ECE6D6',
      primary: '#E07A82',
      accent: '#E9C35A',
    });
  });

  it('resolves appearance + high contrast to a palette', () => {
    expect(resolvePaletteName('system', 'dark', false)).toBe('dark');
    expect(resolvePaletteName('system', null, false)).toBe('light');
    expect(resolvePaletteName('light', 'dark', false)).toBe('light');
    expect(resolvePaletteName('dark', 'light', true)).toBe('darkHighContrast');
    expect(resolvePaletteName('system', 'light', true)).toBe('lightHighContrast');
  });
});
