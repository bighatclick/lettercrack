import { useAppStore } from '@/data/store';
import { type Outfit, sanitizeOutfit } from '@/engine/wardrobe';

/** The player's Inky outfit, for every place their own Inky appears. */
export function useOutfit(): Outfit {
  const saved = useAppStore((s) => s.root!.outfit);
  return sanitizeOutfit(saved);
}
