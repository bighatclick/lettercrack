import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'chevron'
  | 'gear'
  | 'calendar'
  | 'chart'
  | 'flame'
  | 'share'
  | 'check'
  | 'more'
  | 'delete'
  | 'bulb'
  | 'search'
  | 'play'
  | 'lock'
  | 'home'
  | 'star'
  | 'bell';

/** Small line icons drawn for LetterCrack (24 × 24 grid). Decorative: hidden from screen readers. */
export function Icon({ name, size = 22, color, strokeWidth = 2.4 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'back' ? <Path d="M15 5l-7 7 7 7" {...s} /> : null}
      {name === 'chevron' ? <Path d="M9 5l7 7-7 7" {...s} /> : null}
      {name === 'gear' ? (
        <>
          <Circle cx="12" cy="12" r="3.2" {...s} />
          <Path
            d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
            {...s}
          />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect x="3" y="4.5" width="18" height="17" rx="4" {...s} />
          <Path d="M16 2.5v4M8 2.5v4M3 10h18" {...s} />
          <Circle cx="8.5" cy="15" r="1.4" fill={color} />
          <Circle cx="15.5" cy="15" r="1.4" fill={color} />
        </>
      ) : null}
      {name === 'chart' ? <Path d="M5 20V11M11 20V5M17 20v-7M3 20.5h18" {...s} /> : null}
      {name === 'flame' ? (
        <Path d="M12 2.5c1.2 4 6.5 6 6.5 12a6.5 6.5 0 01-13 0c0-3 2-5 3.2-6.2.1 2.2 1.1 3.4 2.3 3.4-.3-4-.9-6.5 1-9.2z" fill={color} />
      ) : null}
      {name === 'share' ? <Path d="M4 12.5v6.5a2 2 0 002 2h12a2 2 0 002-2v-6.5M16 6.5l-4-4-4 4M12 2.5v13" {...s} /> : null}
      {name === 'check' ? <Path d="M5 12.5l4.5 4.5L19 7" {...s} /> : null}
      {name === 'more' ? (
        <>
          <Circle cx="5" cy="12" r="2" fill={color} />
          <Circle cx="12" cy="12" r="2" fill={color} />
          <Circle cx="19" cy="12" r="2" fill={color} />
        </>
      ) : null}
      {name === 'delete' ? <Path d="M21 5H9.5L3 12l6.5 7H21a1 1 0 001-1V6a1 1 0 00-1-1zM17.5 9l-6 6M11.5 9l6 6" {...s} /> : null}
      {name === 'bulb' ? <Path d="M9 18h6M10 21.5h4M12 2.5a6.8 6.8 0 00-4 12.3V17h8v-2.2a6.8 6.8 0 00-4-12.3z" {...s} /> : null}
      {name === 'search' ? (
        <>
          <Circle cx="11" cy="11" r="7" {...s} />
          <Path d="M20.5 20.5l-4.5-4.5" {...s} />
        </>
      ) : null}
      {name === 'play' ? <Path d="M7.5 4.5l12 7.5-12 7.5z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
      {name === 'lock' ? (
        <>
          <Rect x="5" y="10.5" width="14" height="10.5" rx="3" fill={color} />
          <Path d="M8 10.5V8a4 4 0 018 0v2.5" {...s} />
        </>
      ) : null}
      {name === 'home' ? <Path d="M3.5 11l8.5-7.5 8.5 7.5M6 9.5V20h12V9.5" {...s} /> : null}
      {name === 'star' ? (
        <Path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      ) : null}
      {name === 'bell' ? <Path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 21h4" {...s} /> : null}
    </Svg>
  );
}
