import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { useTheme } from '../theme';
import { typeScale } from '../tokens';

/** IBM Plex Mono advance width is 0.6 em; a little extra keeps letters from touching. */
const MONO_ADVANCE = 0.6;

export type CellMetrics = {
  guessSize: number;
  cipherSize: number;
  cellWidth: number;
  cellHeight: number;
};

/**
 * Cell sizes from the guess font size × in-app text scale × OS font scale, so columns stay aligned
 * at every text size (React Native applies the OS scale to the text itself).
 */
export function useCellMetrics(): CellMetrics {
  const { textScale } = useTheme();
  const { fontScale } = useWindowDimensions();
  return useMemo(() => {
    const scale = textScale * fontScale;
    const guessSize = typeScale.cellGuess.fontSize * scale;
    const cipherSize = typeScale.cellCipher.fontSize * scale;
    // Letter width plus room for the tile's padding and the gap between tiles.
    const cellWidth = Math.ceil(guessSize * MONO_ADVANCE) + 9;
    // cipher line + tile (guess line + padding + 3D edge) + bottom gap; never below the 44 pt touch height.
    const cellHeight = Math.max(44, Math.ceil(cipherSize * 1.35 + guessSize * 1.25 + 6 + 4 + 6));
    return { guessSize, cipherSize, cellWidth, cellHeight };
  }, [textScale, fontScale]);
}

/** Cells per line for a container width (one blank cell separates words). */
export const cellsPerLine = (containerWidth: number, m: CellMetrics) => Math.max(4, Math.floor(containerWidth / m.cellWidth));
