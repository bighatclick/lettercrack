import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { computeStats } from '@/game/stats';
import { today } from '@/game/today';
import { Button, Card, Screen, space, Text } from '@/ui';
import { formatDuration } from '@/ui/format';

/** Stats (S5). Average time only when the timer setting is on. */
export default function StatsScreen() {
  const { t } = useTranslation();
  const root = useAppStore((s) => s.root!);
  const s = useMemo(() => computeStats(root, content, today()), [root]);

  const rows: [string, string][] = [
    [t('stats.solved'), String(s.solved)],
    [t('stats.clean'), String(s.clean)],
    [t('stats.dailies'), String(s.dailiesSolved)],
    [t('stats.streak'), t('stats.days', { count: s.streak })],
    [t('stats.best'), t('stats.days', { count: s.best })],
  ];
  if (s.averageMs !== null) rows.push([t('stats.average'), formatDuration(s.averageMs)]);

  return (
    <Screen>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text variant="display" accessibilityRole="header">
        {t('stats.title')}
      </Text>
      <Card style={{ gap: space.sm }}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
            <Text style={styles.label}>{label}</Text>
            <Text variant="label">{value}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ gap: space.sm }}>
        <Text variant="title" accessibilityRole="header">
          {t('stats.authors')}
        </Text>
        {s.favouriteAuthors.length === 0 ? <Text color="inkMuted">{t('stats.noAuthors')}</Text> : null}
        {s.favouriteAuthors.map((a) => (
          <View key={a.author} style={styles.row} accessible accessibilityLabel={`${a.author}: ${t('stats.authorCount', { count: a.count })}`}>
            <Text variant="quote" style={styles.label}>
              {a.author}
            </Text>
            <Text color="inkMuted">{t('stats.authorCount', { count: a.count })}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  label: { flexShrink: 1 },
});
