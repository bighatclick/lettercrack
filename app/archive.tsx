import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { type ArchiveDay, archiveMonths } from '@/game/archive';
import { dailyKey } from '@/game/session';
import { today } from '@/game/today';
import { Button, Card, minTouch, radius, Screen, space, Text, useTheme } from '@/ui';

/** Archive (S4): every past daily, all playable. Solved days get a brass dot. */
export default function ArchiveScreen() {
  const { t, i18n } = useTranslation();
  const root = useAppStore((s) => s.root!);
  const date = today();
  const months = useMemo(() => archiveMonths(root, content, date), [root, date]);
  const monthName = (m: string) =>
    new Date(`${m}-15T12:00:00Z`).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <Screen>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text variant="display" accessibilityRole="header">
        {t('archive.title')}
      </Text>
      <Text color="inkMuted">{months.length ? t('archive.intro') : t('archive.empty')}</Text>
      {months.map((m) => (
        <Card key={m.month} style={{ gap: space.sm }}>
          <Text variant="title" accessibilityRole="header">
            {monthName(m.month)}
          </Text>
          <View style={styles.grid}>
            {Array.from({ length: m.offset }, (_, i) => (
              <View key={`pad${i}`} style={styles.cell} />
            ))}
            {m.days.map((d) => (
              <Day key={d.date} day={d} />
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Day({ day }: { day: ArchiveDay }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const label = t('archive.dayLabel', {
    date: new Date(`${day.date}T12:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    status: t(`archive.${day.status}`),
  });
  const open = () =>
    day.status === 'solved'
      ? router.push({ pathname: '/solved', params: { key: dailyKey(day.date), from: 'archive' } })
      : router.push(`/puzzle/${encodeURIComponent(dailyKey(day.date))}`);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} style={styles.cell} testID={`archive-${day.date}`}>
      <View
        style={[
          styles.day,
          {
            borderColor: day.status === 'inProgress' ? colors.accent : colors.border,
            backgroundColor: colors.surfaceRaised,
          },
        ]}
      >
        <Text variant="label">{day.day}</Text>
        {/* Status is never colour alone: solved = filled dot, started = ring (and in the label). */}
        <View
          style={[
            styles.dot,
            day.status === 'solved'
              ? { backgroundColor: colors.accent }
              : day.status === 'inProgress'
                ? { borderWidth: 1.5, borderColor: colors.accent }
                : null,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: minTouch + 8, padding: 2 },
  day: { flex: 1, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
