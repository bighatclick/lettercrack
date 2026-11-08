import { G, Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';

/**
 * Inky's wardrobe items, drawn in Inky's 200 × 220 coordinate space (see Inky.tsx).
 * Backdrops sit behind him; hats, glasses and neckwear move with his body.
 * Item ids come from src/engine/wardrobe.ts.
 */

const NAVY = '#1E1B3A';
const BRASS = '#F5BE2E';
const BRASS_DEEP = '#9C6A06';

function star(cx: number, cy: number, r: number, inner = 0.45, points = 5): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    out.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return out.join(' ');
}

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.3} C${x} ${y - s * 0.2} ${x - s} ${y - s * 0.2} ${x - s} ${y + s * 0.3} C${x - s} ${y + s * 0.8} ${x} ${y + s} ${x} ${y + s * 1.3} C${x} ${y + s} ${x + s} ${y + s * 0.8} ${x + s} ${y + s * 0.3} C${x + s} ${y - s * 0.2} ${x} ${y - s * 0.2} ${x} ${y + s * 0.3} Z`;

/** Backdrop disc behind Inky. */
export function OutfitBack({ id }: { id: string | null }) {
  if (!id) return null;
  const disc = (fill: string) => <Circle cx="100" cy="112" r="104" fill={fill} />;
  switch (id) {
    case 'stars':
      return (
        <G>
          {disc('#2A1F6B')}
          {[
            [30, 60, 6],
            [160, 40, 8],
            [176, 120, 5],
            [24, 140, 7],
            [60, 24, 4],
            [140, 186, 5],
            [44, 190, 4],
            [100, 2, 0],
          ].map(([x, y, r], i) => (r ? <Polygon key={i} points={star(x!, y!, r!)} fill="#FFE08A" /> : null))}
          <Circle cx="130" cy="20" r="2.5" fill="#FFFFFF" />
          <Circle cx="186" cy="80" r="2" fill="#FFFFFF" />
          <Circle cx="14" cy="100" r="2" fill="#FFFFFF" />
        </G>
      );
    case 'sunrise':
      return (
        <G>
          {disc('#FFB37A')}
          <Path d="M-4 120 A104 104 0 0 1 204 120 Z" fill="#FFD27A" />
          <Circle cx="100" cy="150" r="58" fill="#FFE9A8" />
          {Array.from({ length: 9 }, (_, i) => (
            <Line key={i} x1="100" y1="150" x2={100 + Math.cos(Math.PI + (i * Math.PI) / 8) * 100} y2={150 + Math.sin(Math.PI + (i * Math.PI) / 8) * 100} stroke="#FFF4D0" strokeWidth={4} opacity={0.6} />
          ))}
        </G>
      );
    case 'books':
      return (
        <G>
          {disc('#8A5A3A')}
          {[60, 120, 180].map((y) => (
            <Rect key={y} x="-4" y={y} width="208" height="6" fill="#5E3A22" />
          ))}
          {(
            [
              // [x, shelf y, height, colour]: books stand on the shelves either side of Inky.
              [30, 60, 26, '#FF6B6B'],
              [44, 60, 22, '#4DA3FF'],
              [144, 60, 24, '#FFC93C'],
              [158, 60, 28, '#20C3AF'],
              [10, 120, 30, '#20C3AF'],
              [24, 120, 24, '#FFC93C'],
              [164, 120, 28, '#FF6B6B'],
              [178, 120, 22, '#4DA3FF'],
              [16, 180, 26, '#8B5CF6'],
              [170, 180, 24, '#FFC93C'],
            ] as const
          ).map(([x, y, h, c], i) => (
            <Rect key={i} x={x} y={y - h} width="12" height={h} rx="2" fill={c} />
          ))}
        </G>
      );
    case 'confetti':
      return (
        <G>
          {disc('#FFF3D6')}
          {Array.from({ length: 26 }, (_, i) => {
            const a = i * 2.4;
            const r = 30 + ((i * 37) % 70);
            const x = 100 + Math.cos(a) * r;
            const y = 112 + Math.sin(a) * r;
            const c = ['#FF6B6B', '#4DA3FF', '#FFC93C', '#20C3AF', '#8B5CF6'][i % 5]!;
            return i % 2 ? (
              <Circle key={i} cx={x} cy={y} r="4" fill={c} />
            ) : (
              <Rect key={i} x={x} y={y} width="9" height="4" rx="1.5" fill={c} rotation={i * 23} origin={`${x}, ${y}`} />
            );
          })}
        </G>
      );
    case 'hearts':
      return (
        <G>
          {disc('#FFE0EC')}
          {[
            [32, 40, 9],
            [168, 46, 11],
            [20, 128, 8],
            [180, 140, 9],
            [60, 190, 7],
            [146, 190, 8],
            [100, 0, 6],
          ].map(([x, y, s], i) => (
            <Path key={i} d={heart(x!, y!, s!)} fill={i % 2 ? '#FF7EB6' : '#FF6B6B'} />
          ))}
        </G>
      );
    default:
      return null;
  }
}

/** Hat on top of the drop. */
export function OutfitHat({ id }: { id: string | null }) {
  switch (id) {
    case 'beret':
      return (
        <G rotation={-10} origin="100, 40">
          <Ellipse cx="98" cy="38" rx="42" ry="15" fill="#E0405A" />
          <Ellipse cx="94" cy="33" rx="26" ry="6" fill="#FF7A8A" opacity={0.6} />
          <Rect x="95" y="17" width="5" height="10" rx="2.5" fill="#B02A44" />
        </G>
      );
    case 'deerstalker':
      return (
        <G>
          <Path d="M58 50 Q100 -8 142 50 Z" fill="#B07A44" />
          <Path d="M72 40 Q100 4 128 40 M64 46 Q100 14 136 46" stroke="#7A5228" strokeWidth={2} fill="none" />
          <Ellipse cx="100" cy="50" rx="48" ry="8" fill="#7A5228" />
          <Path d="M58 50 Q40 60 46 74 L62 54 Z M142 50 Q160 60 154 74 L138 54 Z" fill="#8F6233" />
          <Circle cx="100" cy="18" r="4" fill="#7A5228" />
        </G>
      );
    case 'tophat':
      return (
        <G>
          <Rect x="72" y="-2" width="56" height="46" rx="5" fill={NAVY} />
          <Rect x="72" y="30" width="56" height="9" fill="#FF6B6B" />
          <Ellipse cx="100" cy="46" rx="46" ry="8" fill={NAVY} />
          <Rect x="78" y="2" width="8" height="26" rx="4" fill="#FFFFFF" opacity={0.18} />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Polygon points="64,50 64,14 82,32 100,4 118,32 136,14 136,50" fill={BRASS} stroke={BRASS_DEEP} strokeWidth={2.5} strokeLinejoin="round" />
          <Rect x="64" y="40" width="72" height="10" fill={BRASS_DEEP} opacity={0.35} />
          <Circle cx="100" cy="30" r="5" fill="#FF6B6B" />
          <Circle cx="78" cy="40" r="3.5" fill="#4DA3FF" />
          <Circle cx="122" cy="40" r="3.5" fill="#20C3AF" />
          <Circle cx="64" cy="14" r="3.5" fill={BRASS} />
          <Circle cx="136" cy="14" r="3.5" fill={BRASS} />
          <Circle cx="100" cy="4" r="3.5" fill={BRASS} />
        </G>
      );
    case 'partyhat':
      return (
        <G rotation={8} origin="100, 48">
          <Polygon points="74,50 100,4 126,50" fill="#20C3AF" />
          <Path d="M82 34 L112 22 M78 44 L120 30" stroke="#FFC93C" strokeWidth={5} strokeLinecap="round" />
          <Circle cx="100" cy="4" r="6" fill="#FF6B6B" />
          <Ellipse cx="100" cy="50" rx="27" ry="5" fill="#0E9F8E" />
        </G>
      );
    case 'laurel':
      return (
        <G>
          {Array.from({ length: 6 }, (_, i) => {
            const tL = i / 5;
            const xL = 56 + tL * 38;
            const yL = 72 - Math.sin(tL * Math.PI * 0.55) * 34;
            const xR = 200 - xL;
            return (
              <G key={i}>
                <Ellipse cx={xL} cy={yL} rx="10" ry="5" fill={i % 2 ? '#3FA34D' : '#5BC26A'} rotation={-50 + i * 10} origin={`${xL}, ${yL}`} />
                <Ellipse cx={xR} cy={yL} rx="10" ry="5" fill={i % 2 ? '#3FA34D' : '#5BC26A'} rotation={50 - i * 10} origin={`${xR}, ${yL}`} />
              </G>
            );
          })}
          <Circle cx="100" cy="40" r="4" fill={BRASS} />
        </G>
      );
    case 'mortarboard':
      return (
        <G>
          <Path d="M72 46 Q100 32 128 46 L128 56 Q100 44 72 56 Z" fill="#2B2752" />
          <Polygon points="48,32 100,14 152,32 100,50" fill={NAVY} />
          <Circle cx="100" cy="32" r="3.5" fill={BRASS} />
          <Path d="M100 32 L144 38 L146 62" stroke={BRASS} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Rect x="141" y="60" width="10" height="12" rx="3" fill={BRASS} />
        </G>
      );
    default:
      return null;
  }
}

/** Glasses over the eyes. `monocle` is drawn by Inky himself. */
export function OutfitFace({ id }: { id: string | null }) {
  switch (id) {
    case 'specs':
      return (
        <G>
          <Circle cx="76" cy="122" r="24" fill="#E6F3FF" fillOpacity={0.15} stroke="#7A4A22" strokeWidth={5} />
          <Circle cx="124" cy="122" r="24" fill="#E6F3FF" fillOpacity={0.15} stroke="#7A4A22" strokeWidth={5} />
          <Path d="M98 116 Q100 111 102 116" stroke="#7A4A22" strokeWidth={4} fill="none" />
          <Line x1="52" y1="118" x2="36" y2="112" stroke="#7A4A22" strokeWidth={4} strokeLinecap="round" />
          <Line x1="148" y1="118" x2="164" y2="112" stroke="#7A4A22" strokeWidth={4} strokeLinecap="round" />
          <Path d="M62 108 q6 -6 14 -6 M110 108 q6 -6 14 -6" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
        </G>
      );
    case 'shades':
      return (
        <G>
          <Polygon points={star(76, 122, 30, 0.62)} fill="#FF4FA0" />
          <Polygon points={star(124, 122, 30, 0.62)} fill="#FF4FA0" />
          <Circle cx="76" cy="122" r="16" fill={NAVY} opacity={0.82} />
          <Circle cx="124" cy="122" r="16" fill={NAVY} opacity={0.82} />
          <Path d="M66 116 q4 -5 10 -5 M114 116 q4 -5 10 -5" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
          <Line x1="96" y1="118" x2="104" y2="118" stroke="#FF4FA0" strokeWidth={5} strokeLinecap="round" />
        </G>
      );
    case 'goggles':
      return (
        <G>
          <Path d="M32 120 L168 120" stroke="#3A3A5A" strokeWidth={9} strokeLinecap="round" />
          <Circle cx="76" cy="122" r="24" fill="#9FE8FF" fillOpacity={0.45} stroke="#8A93A8" strokeWidth={7} />
          <Circle cx="124" cy="122" r="24" fill="#9FE8FF" fillOpacity={0.45} stroke="#8A93A8" strokeWidth={7} />
          <Path d="M62 110 q6 -6 14 -6 M110 110 q6 -6 14 -6" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>
      );
    default:
      return null;
  }
}

/** Neckwear, low on the body below the smile. */
export function OutfitNeck({ id }: { id: string | null }) {
  const art = neckArt(id);
  // Raised a little so neckwear sits under the smile rather than by the feet.
  return art ? <G transform="translate(0,-8)">{art}</G> : null;
}

function neckArt(id: string | null) {
  switch (id) {
    case 'bowtie':
      return (
        <G>
          <Polygon points="78,184 100,194 78,204" fill="#FF6B6B" strokeLinejoin="round" stroke="#D9484F" strokeWidth={2} />
          <Polygon points="122,184 100,194 122,204" fill="#FF6B6B" strokeLinejoin="round" stroke="#D9484F" strokeWidth={2} />
          <Circle cx="100" cy="194" r="5.5" fill="#D9484F" />
        </G>
      );
    case 'scarf':
      return (
        <G>
          <Path d="M54 182 Q100 200 146 182 L148 194 Q100 214 52 194 Z" fill="#FF9A4D" />
          <Path d="M58 188 Q100 204 142 188" stroke="#FFE08A" strokeWidth={3} fill="none" />
          <Rect x="118" y="194" width="14" height="22" rx="4" fill="#FF9A4D" rotation={-8} origin="125, 194" />
          <Line x1="120" y1="208" x2="132" y2="206" stroke="#FFE08A" strokeWidth={3} />
        </G>
      );
    case 'medal':
      return (
        <G>
          <Polygon points="84,176 96,176 104,196 96,198" fill="#4DA3FF" />
          <Polygon points="116,176 104,176 96,196 104,198" fill="#2B7AD6" />
          <Circle cx="100" cy="202" r="10" fill={BRASS} stroke={BRASS_DEEP} strokeWidth={2} />
          <Polygon points={star(100, 202, 5.5)} fill={BRASS_DEEP} />
        </G>
      );
    case 'ruff':
      return (
        <G>
          {Array.from({ length: 9 }, (_, i) => {
            const x = 58 + i * 10.5;
            const y = 188 + Math.sin((i / 8) * Math.PI) * 8;
            return <Ellipse key={i} cx={x} cy={y} rx="8" ry="9" fill="#FFFFFF" stroke="#C9C3E8" strokeWidth={2} />;
          })}
        </G>
      );
    case 'sash':
      return (
        <G>
          <Path d="M44 150 L56 138 L156 200 L144 212 Z" fill="#8B5CF6" />
          <Path d="M48 146 L150 206" stroke="#C9B8FF" strokeWidth={2} />
          <Polygon points={star(112, 184, 9)} fill={BRASS} stroke={BRASS_DEEP} strokeWidth={1.5} />
        </G>
      );
    default:
      return null;
  }
}
