import { awardBadges, BADGE_GROUPS, BADGE_IDS, type BadgeFacts, badgesIn, mergeEarned } from '../badges';

const none: BadgeFacts = {
  solves: 0,
  clean: 0,
  letters: 0,
  hardSolves: 0,
  expertSolves: 0,
  bestStreak: 0,
  dailies: 0,
  archiveSolves: 0,
  perfectWeeks: 0,
  authors: 0,
  setsDone: 0,
  chaptersDone: 0,
  monthMedals: 0,
  sundays: 0,
};

describe('badges', () => {
  it('has about thirty unique badges, each in one group', () => {
    expect(BADGE_IDS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(BADGE_IDS).size).toBe(BADGE_IDS.length);
    expect(BADGE_GROUPS.flatMap(badgesIn).sort()).toEqual([...BADGE_IDS].sort());
  });

  it('awards nothing to a new player and returns the same object', () => {
    const earned = {};
    const r = awardBadges(earned, '2027-01-01', none);
    expect(r.fresh).toEqual([]);
    expect(r.earned).toBe(earned);
  });

  it('awards state badges from lifetime facts, dated today', () => {
    const r = awardBadges({}, '2027-01-05', { ...none, solves: 12, clean: 1, bestStreak: 7, letters: 1200 });
    expect(r.fresh).toEqual(expect.arrayContaining(['first_solve', 'solves_10', 'first_clean', 'streak_3', 'streak_7', 'letters_1000']));
    expect(r.fresh).not.toContain('solves_50');
    expect(r.earned.solves_10).toBe('2027-01-05');
  });

  it('awards moment badges only with a matching solve', () => {
    expect(awardBadges({}, 'd', none).fresh).not.toContain('night_owl');
    const late = awardBadges({}, 'd', none, { hour: 23, letters: 120, clean: true, goalsDone: true }).fresh;
    expect(late).toEqual(expect.arrayContaining(['night_owl', 'marathon', 'marathon_clean', 'goals_all']));
    expect(late).not.toContain('early_bird');
    expect(awardBadges({}, 'd', none, { hour: 6, letters: 10, clean: false, goalsDone: false }).fresh).toEqual(['early_bird']);
  });

  it('never takes a badge away when facts drop (a streak resets)', () => {
    const first = awardBadges({}, '2027-01-07', { ...none, bestStreak: 7 }).earned;
    const later = awardBadges(first, '2027-02-01', none).earned;
    expect(later.streak_7).toBe('2027-01-07');
  });

  it('merges as a union keeping the earliest date', () => {
    expect(mergeEarned({ a: '2027-01-05', b: '2027-01-01' }, { a: '2027-01-02', c: '2027-01-03' })).toEqual({
      a: '2027-01-02',
      b: '2027-01-01',
      c: '2027-01-03',
    });
  });
});
