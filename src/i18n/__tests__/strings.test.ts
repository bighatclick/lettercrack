import en from '../en.json';
import pseudo from '../pseudo.json';

type Tree = { [k: string]: string | Tree };

function flatten(t: Tree, prefix = ''): Record<string, string> {
  return Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const placeholders = (s: string) => (s.match(/\{\{[^}]+\}\}/g) ?? []).sort();

describe('UI strings', () => {
  const enFlat = flatten(en);
  const pseudoFlat = flatten(pseudo);

  it('pseudo-locale is regenerated from en.json (run `npm run i18n:pseudo`)', () => {
    expect(Object.keys(pseudoFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('pseudo-locale keeps every {{placeholder}}', () => {
    for (const [k, v] of Object.entries(enFlat)) {
      expect(placeholders(pseudoFlat[k] ?? '')).toEqual(placeholders(v));
    }
  });

  it('never uses King Features trademarks (CLAUDE.md rule 7)', () => {
    const banned = /cryptoquip|cryptoquote/i;
    for (const [k, v] of Object.entries(enFlat)) {
      expect({ k, hit: banned.test(v) }).toEqual({ k, hit: false });
    }
  });
});
