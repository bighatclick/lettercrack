import type { Root } from '@/data/schema';
import { addDays, type LocalDate } from '@/engine/daily';

/** F9: offer the opt-in reminder once, after the 2nd daily solve. */
export const shouldOfferReminder = (root: Root): boolean =>
  !root.meta.reminderOffered && !root.settings.dailyReminder && root.daily.solvedDates.length >= 2;

export const noteReminderOffered = (root: Root): Root => ({ ...root, meta: { ...root.meta, reminderOffered: true } });

export const REMINDER_HOUR = 9;
export const REMINDER_DAYS_AHEAD = 7;

/**
 * Dates for a local "Today's quote is ready" notification at REMINDER_HOUR local time.
 * Rescheduled on every app open and daily solve, so a day already solved never gets one.
 */
export function reminderDates(today: LocalDate, hourNow: number, solvedToday: boolean): LocalDate[] {
  const start = solvedToday || hourNow >= REMINDER_HOUR ? 1 : 0;
  return Array.from({ length: REMINDER_DAYS_AHEAD }, (_, i) => addDays(today, start + i));
}
