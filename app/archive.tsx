import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { content } from '@/content/quotes';
import type { Root } from '@/data/schema';
import { useAppStore } from '@/data/store';
import { type ArchiveDay, archiveMonths, dailyStart } from '@/game/archive';
import { solvedDailyDates, stampBook } from '@/game/awards';
import { dailyKey } from '@/game/session';
import { today } from '@/game/today';
import { Card, Enter, Hero, Inky, minTouch, ProgressRing, radius, Screen, space, Tag, Text, useTheme } from '@/ui';
import { shade } from '@/ui/color';

/** Archive (S4): every past daily, all playable. Each weekday column has its own colour. */
export default function ArchiveScreen() {
  const { t, i18n } = useTranslation();
  const { hue } = useTheme();
  const root = useAppStore((s) => s.root!);
  const date = today();
  const months = useMemo(() => archiveMonths(root, content, date), [root, date]);
  // Monthly stamp book: each solved daily is a stamp; a full month earns a medal.
  const stamps = useMemo(() => new Map(stampBook(solvedDailyDates(root, content, date), date, dailyStart(root)).map((m) => [m.month, m])), [root, date]);
  const monthName = (m: string) =>
    new Date(`${m}-15T12:00:00Z`).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  // Monday-first narrow weekday names (2024-01-01 was a Monday).
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(Date.UTC(2024, 0, 1 + i, 12)).toLocaleDateString(i18n.language, { weekday: 'narrow', timeZone: 'UTC' }),
      ),
    [i18n.language],
  );
  const counts = useMemo(() => {
    const all = months.flatMap((m) => m.days);
    return {
      solved: all.filter((d) => d.status === 'solved').length,
      started: all.filter((d) => d.status === 'inProgress').length,
      open: all.filter((d) => d.status === 'open').length,
    };
  }, [months]);

  const hero = (
    <Hero
      gradient="sunset"
      back={{ label: t('common.back'), onPress: () => router.back() }}
      title={t('archive.title')}
      subtitle={months.length ? t('archive.intro') : t('archive.empty')}
      side={<Inky pose="think" size={104} />}
    >
      {months.length ? (
        <View style={styles.counts}>
          <Tag label={t('archive.countSolved', { count: counts.solved })} icon="check" bg="#FFFFFF" fg="#0A6E61" />
          <Tag label={t('archive.countStarted', { count: counts.started })} bg="#FFFFFF" fg="#B23030" />
          <Tag label={t('archive.countOpen', { count: counts.open })} bg="#FFFFFF" fg="#5530C0" />
        </View>
      ) : null}
    </Hero>
  );

  return (
    <Screen hero={hero}>
      {months.map((m, mi) => (
        <Enter key={m.month} index={mi + 1}>
          <Card style={{ gap: space.md }}>
            <View style={styles.monthHead}>
              <View style={[styles.monthPill, { backgroundColor: hue(4 - (mi % 3)).tint }]}>
                <Text variant="label" color={hue(4 - (mi % 3)).deep} accessibilityRole="header">
                  {monthName(m.month)}
                </Text>
              </View>
              {stamps.get(m.month) ? (
                <View
                  accessible
                  // The medal tag is inside this one accessibility element, so the label says it too.
                  accessibilityLabel={
                    t('stamps.label', { month: monthName(m.month), stamped: stamps.get(m.month)!.stamps, count: stamps.get(m.month)!.days }) +
                    (stamps.get(m.month)!.medal ? `. ${t('stamps.medal')}` : '')
                  }
                  testID={`stamps-${m.month}`}
                >
                  {stamps.get(m.month)!.medal ? (
                    <Tag label={t('stamps.medal')} icon="trophy" bg={hue(1).solid} fg={hue(1).on} />
                  ) : (
                    <Tag label={t('stamps.count', { stamped: stamps.get(m.month)!.stamps, count: stamps.get(m.month)!.days })} icon="check" bg={hue(3).tint} fg={hue(3).deep} />
                  )}
                </View>
              ) : null}
            </View>
            <View style={styles.grid} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {weekdays.map((w, i) => (
                <View key={i} style={styles.weekday}>
                  <Text variant="overline" color={hue(i).deep}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.grid}>
              {Array.from({ length: m.offset }, (_, i) => (
                <View key={`pad${i}`} style={styles.cell} />
              ))}
              {m.days.map((d, di) => (
                <Day key={d.date} day={d} column={(m.offset + di) % 7} root={root} />
              ))}
            </View>
          </Card>
        </Enter>
      ))}
      {months.length ? (
        <View style={styles.legend}>
          <Legend kind="solved" label={t('archive.legendSolved')} />
          <Legend kind="inProgress" label={t('archive.legendInProgress')} />
        </View>
      ) : null}
    </Screen>
  );
}

function progressOf(root: Root, date: string): number {
  const save = root.inProgress[dailyKey(date)];
  const q = save ? content.quote(save.quoteId) : undefined;
  if (!save || !q) return 0;
  const letters = q.text.replace(/[^a-z]/gi, '').length;
  return letters ? save.entries.filter((e) => e !== '').length / letters : 0;
}

function Day({ day, column, root }: { day: ArchiveDay; column: number; root: Root }) {
  const { t, i18n } = useTranslation();
  const { colors, hue } = useTheme();
  const h = hue(column);
  const label = t('archive.dayLabel', {
    date: new Date(`${day.date}T12:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    status: t(`archive.${day.status}`),
  });
  const open = () =>
    day.status === 'solved'
      ? router.push({ pathname: '/solved', params: { key: dailyKey(day.date), from: 'archive' } })
      : router.push(`/puzzle/${encodeURIComponent(dailyKey(day.date))}`);
  const solved = day.status === 'solved';
  const started = day.status === 'inProgress';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} style={styles.cell} testID={`archive-${day.date}`}>
      <View
        style={[
          styles.day,
          solved
            ? { backgroundColor: h.solid, borderBottomColor: shade(h.solid) }
            : { backgroundColor: started ? colors.surface : colors.surfaceRaised, borderBottomColor: colors.border },
        ]}
      >
        {started ? (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.ringBox}>
              <ProgressRing progress={Math.max(0.12, progressOf(root, day.date))} size={38} stroke={3.5} color={hue(0).solid} track={colors.border} />
            </View>
          </View>
        ) : null}
        <Text variant="label" color={solved ? h.on : colors.ink}>
          {day.day}
        </Text>
        {/* Status is never colour alone: solved = dot, started = ring (and both are in the label). */}
        {solved ? <View style={[styles.dot, { backgroundColor: h.on }]} /> : null}
      </View>
    </Pressable>
  );
}

function Legend({ kind, label }: { kind: 'solved' | 'inProgress'; label: string }) {
  const { colors, hue } = useTheme();
  return (
    <View style={styles.legendItem}>
      {kind === 'solved' ? (
        <View style={[styles.legendSwatch, { backgroundColor: hue(2).solid }]}>
          <View style={[styles.dot, { backgroundColor: hue(2).on }]} />
        </View>
      ) : (
        <ProgressRing progress={0.6} size={22} stroke={3} color={hue(0).solid} track={colors.border} />
      )}
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  monthPill: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, alignItems: 'center' },
  cell: { width: `${100 / 7}%`, minHeight: minTouch + 4, padding: 3 },
  day: {
    flex: 1,
    borderRadius: radius.md,
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ringBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: space.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legendSwatch: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
