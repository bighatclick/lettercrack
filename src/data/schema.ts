/**
 * Persisted app state (specs.md §9). The whole root is one JSON blob under ROOT_KEY.
 *
 * Changing this shape? CLAUDE.md hard rule 3:
 *   1. bump CURRENT_SCHEMA_VERSION,
 *   2. add migrations/v{N-1}_to_v{N}.ts and register it in migrations/index.ts,
 *   3. add migrations/__fixtures__/v{N}.json (a realistic, well-used save),
 * The migration tests fail until all three exist.
 */

export const CURRENT_SCHEMA_VERSION = 5;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Appearance = 'system' | 'light' | 'dark';
/** Local calendar date, `YYYY-MM-DD`. */
export type LocalDate = string;

export type Settings = {
  autoFill: boolean;
  highlightConflicts: boolean;
  showTimer: boolean;
  /** Index into textSizeSteps (0–3). */
  textSize: 0 | 1 | 2 | 3;
  appearance: Appearance;
  highContrast: boolean;
  sound: boolean;
  haptics: boolean;
  dailyReminder: boolean;
  defaultDifficulty: Difficulty;
};

export type SolvedRecord = {
  date: LocalDate;
  clean: boolean;
  /** Only recorded when the timer setting is on. */
  timeMs: number | null;
  difficulty: Difficulty;
};

/** A puzzle mid-solve; written after every key (F4). */
export type PuzzleSave = {
  quoteId: number;
  mode: 'daily' | 'level';
  /** Set for dailies: the date the daily belongs to. */
  dailyDate: LocalDate | null;
  difficulty: Difficulty;
  /** One entry per character of the quote: the guessed letter, or "" (always "" for non-letters). */
  entries: string[];
  /** Cipher letters revealed by hints. */
  revealed: string[];
  hintsUsed: number;
  checksUsed: number;
  elapsedMs: number;
  updatedAt: number;
};

export type RootV1 = {
  schemaVersion: 1;
  /** ms epoch of first launch; drives the review prompt's "≥ 2 days after install". */
  installedAt: number;
  settings: Settings;
  progress: {
    levelIndex: number;
    /** Every quote ID ever started or solved; drives "no repeats" (rule 6). */
    seenQuoteIds: number[];
    /** quoteId → result of the most recent solve. */
    solved: Record<string, SolvedRecord>;
    /** Hidden locally via "Report quote". */
    reportedQuoteIds: number[];
  };
  daily: {
    streak: number;
    best: number;
    /** ISO week (`YYYY-Www`) in which the weekly free freeze was last used, if any. */
    freezeUsedWeek: string | null;
    /** Dates whose daily was solved on that same date. */
    solvedDates: LocalDate[];
    /** Highest local date seen; streak credit is refused after the clock is wound back below it. */
    highestDateSeen: LocalDate | null;
  };
  hints: {
    /** Purchased + rewarded hints. Cloud merge = max(local, cloud). */
    balance: number;
    freeUsedDate: LocalDate | null;
    freeUsedCount: number;
    rewardedDate: LocalDate | null;
    rewardedCount: number;
  };
  /** Keyed by puzzle key: `daily:YYYY-MM-DD` or `level:<quoteId>`. */
  inProgress: Record<string, PuzzleSave>;
  unlocks: {
    removeAds: boolean;
    packs: string[];
  };
  purchasesCache: {
    productIds: string[];
    updatedAt: number | null;
  };
  /** Counters for the ad policy, review prompt and ATT timing. */
  meta: {
    sessionCount: number;
    solvesSinceInterstitial: number;
    lastInterstitialAt: number | null;
    reviewPromptAt: number[];
    attPrompted: boolean;
    reminderOffered: boolean;
  };
};

/**
 * v2 (Phase 6/7): onboarding and cloud sync.
 * - meta.onboardedAt: when the "A CAT" onboarding finished (null = show it). v1 saves with any
 *   play history migrate to installedAt, so existing players never see onboarding again.
 * - meta.settingsUpdatedAt: last local settings change; settings merge last-write-wins with iCloud.
 */
export type RootV2 = Omit<RootV1, 'schemaVersion' | 'meta'> & {
  schemaVersion: 2;
  meta: RootV1['meta'] & {
    onboardedAt: number | null;
    settingsUpdatedAt: number;
  };
};

/**
 * v3 (engagement, Phase A): daily goals and saved streak freezes.
 * - goals: today's goal progress; resets each local day. Not synced (it is a one-day thing).
 * - daily.bonusFreezes: freezes earned at streak milestones, used after the weekly one.
 * - daily.milestonesAwarded: freeze milestones already paid out. v2 saves are credited for
 *   the milestones their current streak has already passed.
 */
export type GoalsSave = {
  date: LocalDate | null;
  progress: Record<string, number>;
  rewarded: boolean;
};

export type RootV3 = Omit<RootV2, 'schemaVersion' | 'daily'> & {
  schemaVersion: 3;
  daily: {
    streak: number;
    best: number;
    freezeUsedWeek: string | null;
    solvedDates: LocalDate[];
    highestDateSeen: LocalDate | null;
    /** Freezes earned at streak milestones; used after the weekly free one. Merge = max. */
    bonusFreezes: number;
    /** Freeze milestones already paid out (each pays once, ever). */
    milestonesAwarded: number[];
  };
  goals: GoalsSave;
};

/**
 * v4 (engagement, Phases B and C): badges and Inky's wardrobe.
 * - awards.earned: badge id → local date earned. Kept forever; sync merge = union.
 * - awards.seen: badges, ranks and wardrobe items the player has already been shown, so new
 *   ones are celebrated exactly once.
 * - outfit: what Inky wears. Items unlock from progress, so only the choice is stored.
 * Rank, the Library, chapters and the stamp book are derived from existing progress.
 */
export type AwardsSave = { earned: Record<string, LocalDate>; seen: string[] };
export type OutfitSave = { hat: string | null; face: string | null; neck: string | null; bg: string | null };

export type RootV4 = Omit<RootV3, 'schemaVersion'> & {
  schemaVersion: 4;
  awards: AwardsSave;
  outfit: OutfitSave;
};

/**
 * v5: which archive days were actually solved.
 * - progress.lateDailies: daily dates solved on a later day (archive) or on a wound-back clock,
 *   so not in daily.solvedDates. Sync merge = union.
 * - progress.legacyDailyCutoff: saves from before v5 didn't record those, so for them a quote's
 *   solve record dated on or before this date still marks its daily solved (the old rule; nothing
 *   a player saw as solved is lost). Null for installs that started on v5.
 */
export type RootV5 = Omit<RootV4, 'schemaVersion' | 'progress'> & {
  schemaVersion: 5;
  progress: RootV4['progress'] & {
    lateDailies: LocalDate[];
    legacyDailyCutoff: LocalDate | null;
  };
};

/** The current root type. Point this at the newest RootVn when the schema changes. */
export type Root = RootV5;

export function defaultRoot(now: number): Root {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installedAt: now,
    settings: {
      autoFill: true,
      highlightConflicts: true,
      showTimer: false,
      textSize: 0,
      appearance: 'system',
      highContrast: false,
      sound: false,
      haptics: true,
      dailyReminder: false,
      defaultDifficulty: 'medium',
    },
    progress: { levelIndex: 0, seenQuoteIds: [], solved: {}, reportedQuoteIds: [], lateDailies: [], legacyDailyCutoff: null },
    daily: { streak: 0, best: 0, freezeUsedWeek: null, solvedDates: [], highestDateSeen: null, bonusFreezes: 0, milestonesAwarded: [] },
    goals: { date: null, progress: {}, rewarded: false },
    awards: { earned: {}, seen: [] },
    outfit: { hat: null, face: 'monocle', neck: null, bg: null },
    hints: { balance: 0, freeUsedDate: null, freeUsedCount: 0, rewardedDate: null, rewardedCount: 0 },
    inProgress: {},
    unlocks: { removeAds: false, packs: [] },
    purchasesCache: { productIds: [], updatedAt: null },
    meta: {
      sessionCount: 0,
      solvesSinceInterstitial: 0,
      lastInterstitialAt: null,
      reviewPromptAt: [],
      attPrompted: false,
      reminderOffered: false,
      onboardedAt: null,
      settingsUpdatedAt: 0,
    },
  };
}
