import { RANKS, rankFor, ranksReached } from '../rank';

describe('codebreaker rank', () => {
  it('starts as a Rookie with progress toward Apprentice', () => {
    expect(rankFor(0)).toMatchObject({ rank: 'rookie', index: 0, next: 'apprentice', toNext: 500, progress: 0 });
    expect(rankFor(250).progress).toBeCloseTo(0.5);
  });

  it('moves up exactly at each threshold', () => {
    for (const r of RANKS) expect(rankFor(r.xp).rank).toBe(r.id);
    expect(rankFor(1999).rank).toBe('apprentice');
  });

  it('caps at Cipher Master with full progress', () => {
    expect(rankFor(1_000_000)).toMatchObject({ rank: 'master', next: null, toNext: 0, progress: 1 });
  });

  it('treats bad input as zero', () => {
    expect(rankFor(-5).rank).toBe('rookie');
  });

  it('lists every rank reached', () => {
    expect(ranksReached(2000)).toEqual(['rookie', 'apprentice', 'sleuth']);
  });
});
