import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { reporter } from './report';

/** Captures the share card at 1080×1350 and opens the system share sheet. Returns false on failure. */
export async function shareCard(ref: RefObject<HostInstance | null>, dialogTitle: string): Promise<boolean> {
  try {
    if (!ref.current || !(await Sharing.isAvailableAsync())) return false;
    const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1350, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
    return true;
  } catch (e) {
    reporter().warn('share failed', { e: String(e) });
    return false;
  }
}
