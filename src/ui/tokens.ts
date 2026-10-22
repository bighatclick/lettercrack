/**
 * Ink & Parchment: the LetterCrack design system (specs.md §10).
 * Only this app uses it. Every colour in the UI comes from a palette below.
 */

export type Palette = {
  /** Page background. */
  bg: string;
  /** Cards, sheets, the puzzle board. */
  surface: string;
  /** Raised surface, e.g. keyboard keys. */
  surfaceRaised: string;
  /** Primary text and guessed letters. */
  ink: string;
  /** Secondary text: captions, cipher letters. */
  inkMuted: string;
  /** Hairlines and outlines. */
  border: string;
  /** Oxblood: primary actions and emphasis. */
  primary: string;
  /** Text drawn on top of `primary`. */
  onPrimary: string;
  /** Brass: selection underline, streak flame, solved dots. Not for body text. */
  accent: string;
  /** Pre-filled (given) letters. */
  given: string;
  /** Conflict outline / underline colour. */
  conflict: string;
  /** Conflict cell fill (conflict colour at 15%). */
  conflictFill: string;
};

export type PaletteName = 'light' | 'dark' | 'lightHighContrast' | 'darkHighContrast';

export const palettes: Record<PaletteName, Palette> = {
  light: {
    bg: '#F4EEDF',
    surface: '#FFFBF2',
    surfaceRaised: '#EBE3CF',
    ink: '#1E2A44',
    inkMuted: '#55607A',
    border: '#D9CFB8',
    primary: '#8C2F39',
    onPrimary: '#FFFBF2',
    accent: '#D4A017',
    given: '#5B6B8C',
    conflict: '#C0392B',
    conflictFill: 'rgba(192, 57, 43, 0.15)',
  },
  dark: {
    bg: '#12161F',
    surface: '#1B2130',
    surfaceRaised: '#262D3F',
    ink: '#ECE6D6',
    inkMuted: '#A9A491',
    border: '#343C52',
    primary: '#E07A82',
    onPrimary: '#12161F',
    accent: '#E9C35A',
    given: '#9AA8C7',
    conflict: '#E5675A',
    conflictFill: 'rgba(229, 103, 90, 0.15)',
  },
  lightHighContrast: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#E8E2D2',
    ink: '#000814',
    inkMuted: '#28324A',
    border: '#1E2A44',
    primary: '#6E1420',
    onPrimary: '#FFFFFF',
    accent: '#8A6400',
    given: '#2E3B5C',
    conflict: '#A01818',
    conflictFill: 'rgba(160, 24, 24, 0.18)',
  },
  darkHighContrast: {
    bg: '#000000',
    surface: '#0B0E14',
    surfaceRaised: '#1B2130',
    ink: '#FFFFFF',
    inkMuted: '#DDD8C8',
    border: '#ECE6D6',
    primary: '#FF9AA2',
    onPrimary: '#000000',
    accent: '#FFD66B',
    given: '#C3CEE8',
    conflict: '#FF8A7D',
    conflictFill: 'rgba(255, 138, 125, 0.2)',
  },
};

export const fontFamily = {
  /** Quotes and author names. */
  serif: 'LibreBaskerville_400Regular',
  serifItalic: 'LibreBaskerville_400Regular_Italic',
  serifBold: 'LibreBaskerville_700Bold',
  /** Cipher cells and the keyboard: equal-width letters keep columns aligned. */
  mono: 'IBMPlexMono_600SemiBold',
  /** UI text. */
  sans: 'IBMPlexSans_400Regular',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
} as const;

/**
 * Text-size slider (4 steps, specs.md §11). Applied on top of the OS
 * Dynamic Type / font scale, which React Native applies automatically.
 */
export const textSizeSteps = [1, 1.15, 1.3, 1.5] as const;
export type TextSizeStep = 0 | 1 | 2 | 3;

export const typeScale = {
  display: { fontFamily: fontFamily.serifBold, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 30 },
  quote: { fontFamily: fontFamily.serif, fontSize: 20, lineHeight: 30 },
  body: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.sansSemiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18 },
  /** Guess letter in a puzzle cell. */
  cellGuess: { fontFamily: fontFamily.mono, fontSize: 24, lineHeight: 30 },
  /** Cipher letter above a cell. */
  cellCipher: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 16 },
  key: { fontFamily: fontFamily.mono, fontSize: 20, lineHeight: 24 },
} as const;
export type TextVariant = keyof typeof typeScale;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/** Minimum touch target (CLAUDE.md: ≥ 44 pt). */
export const minTouch = 44;
/** Keyboard key height (specs.md §10). */
export const keyHeight = 52;

export const motion = {
  /** Solve reveal: letters flip cipher → plain, left to right. */
  solveRevealMs: 600,
  /** Used instead of movement when Reduce Motion is on. */
  fadeMs: 200,
} as const;
