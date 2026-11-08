import { HomeWidget } from '@modules/home-widget';
import type { TFunction } from 'i18next';

import { content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { widgetPayload } from '@/game/widget';
import { today } from '@/game/today';

let last = '';

/** Sends the widget a fresh snapshot when it changed. A no-op without the native module. */
export function syncWidget(root: Root | null, t: TFunction): void {
  if (!HomeWidget || !root) return;
  try {
    const json = JSON.stringify(
      widgetPayload(
        root,
        content,
        today(),
        { title: t('widget.title'), play: t('widget.play'), solved: t('widget.solved'), newDay: t('widget.newDay') },
        (count) => t('widget.streak', { count }),
      ),
    );
    if (json === last) return;
    last = json;
    HomeWidget.setData(json);
  } catch {
    // The widget is a nicety; never let it affect the app.
  }
}
