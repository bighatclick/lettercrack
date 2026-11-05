import type { TFunction } from 'i18next';

import { useAppStore } from '@/data/store';
import { today } from '@/game/today';

import { scheduleReminders } from './notifications';

/** Re-schedules (or cancels) the daily reminders from the current settings. Call on open and after a daily solve. */
export function syncReminders(t: TFunction) {
  const root = useAppStore.getState().root;
  if (!root) return;
  const date = today();
  void scheduleReminders({
    enabled: root.settings.dailyReminder,
    today: date,
    solvedToday: root.daily.solvedDates.includes(date),
    title: t('notifications.title'),
    body: t('notifications.body'),
  });
}
