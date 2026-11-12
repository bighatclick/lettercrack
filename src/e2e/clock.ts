/**
 * E2E builds only (EXPO_PUBLIC_E2E=1). Never imported by release builds: every import site is
 * guarded by an inline `process.env.EXPO_PUBLIC_E2E === '1'` check.
 *
 * The test clock: the iOS simulator uses the Mac's clock and can't be moved like an Android emulator
 * (`adb shell date`). So E2E builds replace the global `Date` with one shifted by an offset, which
 * Maestro sets through `lettercrack://e2e?at=…` (see `app/e2e.tsx`). The offset is kept in its own
 * MMKV file, so it survives app restarts, and `clearState` (a fresh install) resets it.
 *
 * Also here: the iCloud switch. On a simulator the iCloud key-value store can outlive `clearState`,
 * which would leak one flow's progress into the next "fresh install". So E2E builds don't sync
 * unless a flow turns it on (`lettercrack://e2e?cloud=on`).
 */
import { createMMKV } from 'react-native-mmkv';

import { makeShiftedDate, parseLocalDateTime } from './shiftedDate';

const RealDate = Date;
const OFFSET_KEY = 'clockOffsetMs';
const CLOUD_KEY = 'cloud';
const REVIEW_KEY = 'review';

let offsetMs = 0;
let installed = false;
const store = () => createMMKV({ id: 'lettercrack.e2e' });

/** Swaps in the shifted `Date`. Call once, before the save is loaded. */
export function installE2EClock(): void {
  if (installed) return;
  installed = true;
  offsetMs = Number(store().getString(OFFSET_KEY) ?? 0) || 0;
  globalThis.Date = makeShiftedDate(RealDate, () => offsetMs);
}

/** Moves "now" to a device-local date and time ("2027-01-10T10:00:00"), or back to the real clock (null). */
export function setE2EClock(at: string | null): boolean {
  if (at === null) {
    offsetMs = 0;
    store().remove(OFFSET_KEY);
    return true;
  }
  const target = parseLocalDateTime(RealDate, at);
  if (target === null) return false;
  offsetMs = target - RealDate.now();
  store().set(OFFSET_KEY, String(offsetMs));
  return true;
}

export const e2eCloudOn = (): boolean => store().getString(CLOUD_KEY) === 'on';

export function setE2ECloud(on: boolean): void {
  if (on) store().set(CLOUD_KEY, 'on');
  else store().remove(CLOUD_KEY);
}

/**
 * The App Store review prompt. StoreKit's sheet is a separate system process; while it loads on a
 * CI simulator the app's screen can't be read, which broke unrelated flows after a clean solve.
 * So E2E builds don't ask unless a flow turns it on (`lettercrack://e2e?review=on`, flow 14g).
 */
export const e2eReviewOn = (): boolean => store().getString(REVIEW_KEY) === 'on';

export function setE2EReview(on: boolean): void {
  if (on) store().set(REVIEW_KEY, 'on');
  else store().remove(REVIEW_KEY);
}
