import type { TFunction } from 'i18next';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import type { LocalDate } from '@/engine/daily';
import { dailyFacts, reminderVariant } from '@/game/teaser';
import { today } from '@/game/today';

import { scheduleReminders } from './notifications';

/** The reminder for `date`: one of a few spoiler-free variants, chosen by the date. */
export function reminderBody(t: TFunction, date: LocalDate): string {
  const f = dailyFacts(content, date);
  if (!f) return t('notifications.body');
  return t(`notifications.body${reminderVariant(date)}`, { words: f.words, century: f.century, initial: f.initial });
}

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
    body: (d) => reminderBody(t, d),
  });
}
