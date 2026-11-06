import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, Enter, Hero, Inky, Screen, space, Text } from '@/ui';

/** "About our quotes" (S7, store compliance §15): sources and the public-domain policy. */
export default function AboutQuotes() {
  const { t } = useTranslation();
  const hero = (
    <Hero
      gradient="lagoon"
      back={{ label: t('common.back'), onPress: () => router.back() }}
      title={t('aboutQuotes.title')}
      side={<Inky pose="think" size={96} />}
    />
  );
  return (
    <Screen hero={hero}>
      <Enter index={1}>
        <Card style={{ gap: space.md }}>
          <Text>{t('aboutQuotes.p1')}</Text>
          <Text>{t('aboutQuotes.p2')}</Text>
          <Text>{t('aboutQuotes.p3')}</Text>
          <Text color="inkMuted">{t('aboutQuotes.p4')}</Text>
        </Card>
      </Enter>
    </Screen>
  );
}
