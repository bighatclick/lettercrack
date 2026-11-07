/**
 * Inky Pop: the LetterCrack design system (specs.md §10).
 * Multicolour, playful and soft-3D, with Inky the ink-drop mascot. Only this app uses it.
 * Every colour in the UI comes from a palette, hue set or gradient below.
 */

export type Palette = {
  /** Page background (warm cream in light mode, deep indigo in dark). */
  bg: string;
  /** Cards, sheets, the puzzle board. */
  surface: string;
  /** Raised surface, e.g. keyboard keys and quiet chips. */
  surfaceRaised: string;
  /** Primary text and guessed letters. */
  ink: string;
  /** Secondary text: captions. */
  inkMuted: string;
  /** Hairlines and outlines. */
  border: string;
  /** Violet: primary actions, selection outline, emphasis. */
  primary: string;
  /** Text drawn on top of `primary`. */
  onPrimary: string;
  /** Sunny yellow: the selected cell, streak flame, highlights. Not for body text. */
  accent: string;
  /** Text drawn on top of `accent`. */
  onAccent: string;
  /** Pre-filled (given) letters. */
  given: string;
  /** Conflict outline / underline colour. */
  conflict: string;
  /** Conflict cell fill (conflict colour at ~15%). */
  conflictFill: string;
  /** Soft drop shadow colour for cards and tiles. */
  shadow: string;
};

/** One colour family: a bright fill, a deep shade for text and 3D edges, a pale tint and the text that sits on the fill. */
export type Hue = {
  name: HueName;
  solid: string;
  /** Text on `bg`/`tint`, and the 3D bottom edge of a tile. */
  deep: string;
  tint: string;
  /** Text drawn on `solid`. */
  on: string;
};

export type HueName = 'coral' | 'sunny' | 'teal' | 'sky' | 'violet' | 'pink';
export const hueOrder: readonly HueName[] = ['coral', 'sunny', 'teal', 'sky', 'violet', 'pink'];

export type PaletteName = 'light' | 'dark' | 'lightHighContrast' | 'darkHighContrast';

export const palettes: Record<PaletteName, Palette> = {
  light: {
    bg: '#FFF8EC',
    surface: '#FFFFFF',
    surfaceRaised: '#F3EEFF',
    ink: '#1E1B3A',
    inkMuted: '#5A5878',
    border: '#E6DEF5',
    primary: '#6D3FE0',
    onPrimary: '#FFFFFF',
    accent: '#FFC93C',
    onAccent: '#1E1B3A',
    given: '#3F4C80',
    conflict: '#C81D3A',
    conflictFill: 'rgba(200, 29, 58, 0.14)',
    shadow: '#3B2A80',
  },
  dark: {
    bg: '#14112B',
    surface: '#1F1B3D',
    surfaceRaised: '#2B2652',
    ink: '#F4F1FF',
    inkMuted: '#BDB8DD',
    border: '#3A3466',
    primary: '#A98BFF',
    onPrimary: '#14112B',
    accent: '#FFC93C',
    onAccent: '#1E1B3A',
    given: '#AFC0F0',
    conflict: '#FF8080',
    conflictFill: 'rgba(255, 128, 128, 0.18)',
    shadow: '#000000',
  },
  lightHighContrast: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#ECE5FF',
    ink: '#0A0820',
    inkMuted: '#2E2B4A',
    border: '#1E1B3A',
    primary: '#4A1FB8',
    onPrimary: '#FFFFFF',
    accent: '#FFC93C',
    onAccent: '#0A0820',
    given: '#25306A',
    conflict: '#A01818',
    conflictFill: 'rgba(160, 24, 24, 0.18)',
    shadow: '#1E1B3A',
  },
  darkHighContrast: {
    bg: '#000000',
    surface: '#0B0A18',
    surfaceRaised: '#1F1B3D',
    ink: '#FFFFFF',
    inkMuted: '#E0DCF7',
    border: '#F4F1FF',
    primary: '#C9B6FF',
    onPrimary: '#000000',
    accent: '#FFD66B',
    onAccent: '#000000',
    given: '#CCD6F7',
    conflict: '#FF9A8A',
    conflictFill: 'rgba(255, 154, 138, 0.2)',
    shadow: '#000000',
  },
};

const lightHues: Hue[] = [
  { name: 'coral', solid: '#FF6B6B', deep: '#B23030', tint: '#FFE3E3', on: '#1E1B3A' },
  { name: 'sunny', solid: '#FFC93C', deep: '#865600', tint: '#FFF3CC', on: '#1E1B3A' },
  { name: 'teal', solid: '#20C3AF', deep: '#0A6E61', tint: '#D5F6F1', on: '#0E2E2A' },
  { name: 'sky', solid: '#4DA3FF', deep: '#1A5FB8', tint: '#DDEEFF', on: '#0E1F3A' },
  { name: 'violet', solid: '#6D3FE0', deep: '#5530C0', tint: '#EAE2FF', on: '#FFFFFF' },
  { name: 'pink', solid: '#FF7EB6', deep: '#A8305F', tint: '#FFE3F0', on: '#3A0E22' },
];

const darkHues: Hue[] = [
  { name: 'coral', solid: '#FF6B6B', deep: '#FFA3A3', tint: '#3D2141', on: '#1E1B3A' },
  { name: 'sunny', solid: '#FFC93C', deep: '#FFD978', tint: '#3A3038', on: '#1E1B3A' },
  { name: 'teal', solid: '#20C3AF', deep: '#6FE3D3', tint: '#163545', on: '#0E2E2A' },
  { name: 'sky', solid: '#4DA3FF', deep: '#9CCBFF', tint: '#1C2D5C', on: '#0E1F3A' },
  { name: 'violet', solid: '#7044E6', deep: '#C6B0FF', tint: '#2E2563', on: '#FFFFFF' },
  { name: 'pink', solid: '#FF7EB6', deep: '#FFB0D3', tint: '#3D2050', on: '#3A0E22' },
];

const lightHcHues: Hue[] = lightHues.map((h) => ({
  ...h,
  deep: { coral: '#8A1C1C', sunny: '#5E3C00', teal: '#064D44', sky: '#0F4385', violet: '#3E1E9E', pink: '#7E1D45' }[h.name],
  on: h.name === 'violet' ? '#FFFFFF' : '#0A0820',
}));

const darkHcHues: Hue[] = darkHues.map((h) => ({
  ...h,
  tint: '#14122A',
  deep: { coral: '#FFC4C4', sunny: '#FFE7A8', teal: '#A6F0E6', sky: '#C6E1FF', violet: '#DDD0FF', pink: '#FFCDE3' }[h.name],
  on: h.name === 'violet' ? '#FFFFFF' : '#000000',
}));

export const hueSets: Record<PaletteName, readonly Hue[]> = {
  light: lightHues,
  dark: darkHues,
  lightHighContrast: lightHcHues,
  darkHighContrast: darkHcHues,
};

/**
 * Hero gradients (top-left → bottom-right). `text` is the colour that reads on every stop;
 * `glow` tints the soft radial highlights drawn over the gradient.
 */
export type GradientName = 'night' | 'sunset' | 'lagoon' | 'sunshine' | 'sky' | 'candy';
export type GradientSpec = { colors: readonly string[]; text: string; textMuted: string; glow: string };
export const gradients: Record<GradientName, GradientSpec> = {
  night: { colors: ['#2A1F6B', '#4B2BB8', '#7A4CF0'], text: '#FFFFFF', textMuted: '#E4DCFF', glow: '#FFC93C' },
  sunset: { colors: ['#FF6B6B', '#FF9A4D', '#FFC93C'], text: '#1E1B3A', textMuted: '#3B2440', glow: '#FFFFFF' },
  lagoon: { colors: ['#0E9F8E', '#20C3AF', '#5ADBC9'], text: '#0E2E2A', textMuted: '#16443E', glow: '#FFFFFF' },
  sunshine: { colors: ['#FFB020', '#FFC93C', '#FFE08A'], text: '#1E1B3A', textMuted: '#3E3110', glow: '#FFFFFF' },
  sky: { colors: ['#2B7AD6', '#4DA3FF', '#8CC4FF'], text: '#0E1F3A', textMuted: '#14325C', glow: '#FFFFFF' },
  candy: { colors: ['#5B34D6', '#8B5CF6', '#C9478F'], text: '#FFFFFF', textMuted: '#FFE6F3', glow: '#FFC93C' },
};

export const fontFamily = {
  /** Quotes and author names. */
  serif: 'LibreBaskerville_400Regular',
  serifItalic: 'LibreBaskerville_400Regular_Italic',
  serifBold: 'LibreBaskerville_700Bold',
  /** Cipher cells and the keyboard: equal-width letters keep columns aligned. */
  mono: 'IBMPlexMono_600SemiBold',
  /** UI text: Nunito, round and friendly. */
  sans: 'Nunito_600SemiBold',
  sansBold: 'Nunito_700Bold',
  sansSemiBold: 'Nunito_800ExtraBold',
  sansBlack: 'Nunito_900Black',
} as const;

/**
 * Text-size slider (4 steps, specs.md §11). Applied on top of the OS
 * Dynamic Type / font scale, which React Native applies automatically.
 */
export const textSizeSteps = [1, 1.15, 1.3, 1.5] as const;
export type TextSizeStep = 0 | 1 | 2 | 3;

export const typeScale = {
  hero: { fontFamily: fontFamily.sansBlack, fontSize: 34, lineHeight: 40 },
  display: { fontFamily: fontFamily.sansBlack, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fontFamily.sansSemiBold, fontSize: 20, lineHeight: 26 },
  quote: { fontFamily: fontFamily.serif, fontSize: 20, lineHeight: 30 },
  body: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fontFamily.sansSemiBold, fontSize: 16, lineHeight: 21 },
  caption: { fontFamily: fontFamily.sansBold, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fontFamily.sansBlack, fontSize: 11, lineHeight: 15 },
  number: { fontFamily: fontFamily.sansBlack, fontSize: 40, lineHeight: 44 },
  /** Guess letter in a puzzle cell. */
  cellGuess: { fontFamily: fontFamily.mono, fontSize: 24, lineHeight: 30 },
  /** Cipher letter above a cell. */
  cellCipher: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 16 },
  key: { fontFamily: fontFamily.mono, fontSize: 20, lineHeight: 24 },
} as const;
export type TextVariant = keyof typeof typeScale;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/** Minimum touch target (CLAUDE.md: ≥ 44 pt). */
export const minTouch = 44;
/** Keyboard key height (specs.md §10). */
export const keyHeight = 52;

export const motion = {
  /** Solve reveal: letters flip cipher → plain, left to right. */
  solveRevealMs: 600,
  /** Used instead of movement when Reduce Motion is on. */
  fadeMs: 200,
  /** Stagger between items that enter one after another. */
  staggerMs: 60,
} as const;

/** Soft, coloured drop shadow (iOS shadow + Android elevation). */
export function softShadow(color: string, elevation = 6) {
  return {
    shadowColor: color,
    shadowOpacity: 0.16,
    shadowRadius: elevation * 2,
    shadowOffset: { width: 0, height: elevation },
    elevation,
  } as const;
}
