import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { displayStreak } from '@/engine/streak';
import { needsOnboarding } from '@/game/onboarding';
import { dailyKey, nextLevelRef } from '@/game/session';
import { today } from '@/game/today';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, space, Text } from '@/ui';

/** Home (S1): today's quote, the level path, archive, stats and settings. No ads. */
export default function Home() {
  const { t } = useTranslation();
  const root = useAppStore((s) => s.root!);
  const status = useAppStore((s) => s.loadStatus);
  const date = today();
  const key = dailyKey(date);
  const solvedToday = root.daily.solvedDates.includes(date);
  const inProgress = !!root.inProgress[key];
  const streak = displayStreak(root.daily, date);
  const levelRef = nextLevelRef(root, content, root.settings.defaultDifficulty);

  if (needsOnboarding(root)) return <Redirect href="/onboarding" />;

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('app.name')}
      </Text>
      {status === 'recoveredFromBackup' ? <Text color="inkMuted">{t('common.dataRecovered')}</Text> : null}

      <Card style={{ gap: 8 }}>
        <Text variant="title">{t('home.title')}</Text>
        <Text color="inkMuted">
          {solvedToday ? t('home.dailySolved') : inProgress ? t('home.dailyInProgress') : t('home.dailyLocked')}
        </Text>
        {streak > 0 ? (
          <Text variant="label" color="primary">
            {t('home.streak', { count: streak })}
          </Text>
        ) : null}
        {solvedToday ? (
          <Button
            label={t('home.viewSolved')}
            variant="secondary"
            onPress={() => router.push({ pathname: '/solved', params: { key } })}
          />
        ) : (
          <Button
            label={inProgress ? t('home.resume') : t('home.play')}
            onPress={() => router.push(`/puzzle/${encodeURIComponent(key)}`)}
            testID="home-daily"
          />
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <Text variant="title">{t('home.levels')}</Text>
        {levelRef ? (
          <Button
            label={t('home.continueLevel', { level: root.progress.levelIndex + 1 })}
            variant="secondary"
            onPress={() => router.push(`/puzzle/${encodeURIComponent(levelRef.key)}`)}
            testID="home-level"
          />
        ) : (
          <Text color="inkMuted">{t('home.noLevels')}</Text>
        )}
      </Card>

      <View style={styles.links}>
        <Button label={t('home.archive')} variant="secondary" onPress={() => router.push('/archive')} style={styles.link} testID="home-archive" />
        <Button label={t('home.stats')} variant="secondary" onPress={() => router.push('/stats')} style={styles.link} testID="home-stats" />
        <Button label={t('home.settings')} variant="secondary" onPress={() => router.push('/settings')} style={styles.link} testID="home-settings" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  link: { flexGrow: 1 },
});
