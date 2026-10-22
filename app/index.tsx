import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/data/store';
import { Button, Card, Screen, Text } from '@/ui';

/** Placeholder home (S1). The real daily card, level path and archive land in Phases 3–4. */
export default function Home() {
  const { t } = useTranslation();
  const streak = useAppStore((s) => s.root?.daily.streak ?? 0);
  const status = useAppStore((s) => s.loadStatus);

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('app.name')}
      </Text>
      {status === 'recoveredFromBackup' ? <Text color="inkMuted">{t('common.dataRecovered')}</Text> : null}
      <Card>
        <Text variant="title">{t('home.title')}</Text>
        <Text color="inkMuted">{t('home.dailyLocked')}</Text>
        <Text variant="caption" color="inkMuted">
          {t('home.streak', { count: streak })}
        </Text>
      </Card>
      <Button label={t('home.play')} disabled />
    </Screen>
  );
}
