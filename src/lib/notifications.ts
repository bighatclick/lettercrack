/**
 * Opt-in daily reminder (F9). Local notifications only; nothing leaves the device.
 * The permission prompt only ever appears after the player opts in (never at launch, S8).
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { dayNumber, type LocalDate } from '@/engine/daily';
import { REMINDER_HOUR, reminderDates } from '@/game/reminder';

import { reporter } from './report';

const CHANNEL = 'daily';

export async function requestReminderPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return res.granted;
  } catch (e) {
    reporter().warn('notification permission failed', { e: String(e) });
    return false;
  }
}

/** Replaces all scheduled reminders. `enabled` false just cancels them. */
export async function scheduleReminders(opts: {
  enabled: boolean;
  today: LocalDate;
  solvedToday: boolean;
  title: string;
  /** Text for the reminder on `date` (varies by day; never a spoiler). */
  body: (date: LocalDate) => string;
}): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!opts.enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: opts.title,
        importance: AndroidImportance.DEFAULT,
      });
    }
    const now = new Date();
    for (const date of reminderDates(opts.today, now.getHours(), opts.solvedToday)) {
      const d = new Date(dayNumber(date) * 86_400_000);
      const when = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), REMINDER_HOUR, 0, 0);
      if (when.getTime() <= now.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: opts.title, body: opts.body(date) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  } catch (e) {
    reporter().warn('scheduling reminders failed', { e: String(e) });
  }
}
