import { DEFAULT_OUTFIT, ITEMS, isUnlocked, sanitizeOutfit, SLOTS, type UnlockFacts, unlockedItems, wear } from '../wardrobe';

const nothing: UnlockFacts = { ranks: ['rookie'], badges: {}, sets: [] };

describe('wardrobe', () => {
  it('has unique items in every slot', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const slot of SLOTS) expect(ITEMS.some((i) => i.slot === slot)).toBe(true);
  });

  it('starts with only the monocle', () => {
    expect(unlockedItems(nothing)).toEqual(['monocle']);
  });

  it('unlocks by rank, badge and finished set', () => {
    const f: UnlockFacts = { ranks: ['rookie', 'apprentice'], badges: { night_owl: '2027-01-01' }, sets: ['poets'] };
    expect(unlockedItems(f)).toEqual(expect.arrayContaining(['beret', 'shades', 'laurel', 'monocle']));
    expect(isUnlocked(ITEMS.find((i) => i.id === 'crown')!, f)).toBe(false);
  });

  it('refuses locked, unknown or wrong-slot items and allows taking things off', () => {
    expect(wear(DEFAULT_OUTFIT, 'hat', 'crown', nothing)).toBe(DEFAULT_OUTFIT);
    expect(wear(DEFAULT_OUTFIT, 'hat', 'monocle', nothing)).toBe(DEFAULT_OUTFIT);
    expect(wear(DEFAULT_OUTFIT, 'hat', 'nope', nothing)).toBe(DEFAULT_OUTFIT);
    expect(wear(DEFAULT_OUTFIT, 'face', null, nothing).face).toBeNull();
    const f: UnlockFacts = { ...nothing, ranks: ['rookie', 'apprentice'] };
    expect(wear(DEFAULT_OUTFIT, 'hat', 'beret', f).hat).toBe('beret');
  });

  it('sanitizes stored outfits', () => {
    expect(sanitizeOutfit(undefined)).toEqual(DEFAULT_OUTFIT);
    expect(sanitizeOutfit({ hat: 'monocle', face: 'specs', neck: null, bg: 'gone' })).toEqual({ hat: null, face: 'specs', neck: null, bg: null });
  });
});
