import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card, Screen, Text } from '@/ui';

/** "About our quotes" (S7, store compliance §15): sources and the public-domain policy. */
export default function AboutQuotes() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text variant="display" accessibilityRole="header">
        {t('aboutQuotes.title')}
      </Text>
      <Card style={{ gap: 12 }}>
        <Text>{t('aboutQuotes.p1')}</Text>
        <Text>{t('aboutQuotes.p2')}</Text>
        <Text>{t('aboutQuotes.p3')}</Text>
        <Text color="inkMuted">{t('aboutQuotes.p4')}</Text>
      </Card>
    </Screen>
  );
}
