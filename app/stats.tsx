import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { addDays } from '@/engine/daily';
import { computeStats } from '@/game/stats';
import { today } from '@/game/today';
import { Card, Enter, Float, Gradient, Hero, Icon, Inky, ProgressRing, Pulse, radius, Screen, space, Text, useTheme } from '@/ui';
import { shade } from '@/ui/color';
import { formatDuration } from '@/ui/format';
import { type GradientName, gradients, motion } from '@/ui/tokens';

const WEEKS = 6;

/** Stats (S5). Average time only when the timer setting is on. */
export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const { hue } = useTheme();
  const root = useAppStore((s) => s.root!);
  const date = today();
  const s = useMemo(() => computeStats(root, content, date), [root, date]);

  // The last 7 days: did the player solve that day's daily?
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(date, i - 6);
        return {
          date: d,
          done: root.daily.solvedDates.includes(d),
          label: new Date(`${d}T12:00:00Z`).toLocaleDateString(i18n.language, { weekday: 'narrow', timeZone: 'UTC' }),
        };
      }),
    [root.daily.solvedDates, date, i18n.language],
  );
  // Solves per week for the last few weeks (oldest first).
  const bars = useMemo(() => {
    const counts = Array.from({ length: WEEKS }, () => 0);
    const start = addDays(date, -(WEEKS * 7 - 1));
    for (const rec of Object.values(root.progress.solved)) {
      if (rec.date < start || rec.date > date) continue;
      const days = Math.round((Date.parse(`${rec.date}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000);
      const w = Math.min(WEEKS - 1, Math.floor(days / 7));
      counts[w] = (counts[w] ?? 0) + 1;
    }
    return counts;
  }, [root.progress.solved, date]);
  const maxBar = Math.max(1, ...bars);
  const cleanShare = s.solved ? s.clean / s.solved : 0;

  const hero = <Hero gradient="night" back={{ label: t('common.back'), onPress: () => router.back() }} title={t('stats.title')} />;

  return (
    <Screen hero={hero}>
      <Enter index={1}>
        <View style={styles.streakCard} accessible accessibilityLabel={`${t('stats.streak')}: ${t('stats.days', { count: s.streak })}. ${t('stats.best')}: ${t('stats.days', { count: s.best })}${root.daily.bonusFreezes > 0 ? `. ${t('stats.freezes', { count: root.daily.bonusFreezes })}` : ''}`}>
          <View style={[StyleSheet.absoluteFill, styles.clip]}>
            <Gradient name="candy" glows={[{ x: 90, y: 10, r: 50, color: '#FFC93C', opacity: 0.45 }, { x: 0, y: 100, r: 50, color: '#FF6B6B', opacity: 0.35 }]} />
          </View>
          <View style={styles.streakTop}>
            <Pulse amount={0.06}>
              <Flame size={58} />
            </Pulse>
            <View style={styles.flex}>
              <Text variant="number" color="#FFFFFF">
                {s.streak}
              </Text>
              <Text variant="label" color="#FFE6F3">
                {t('stats.streakLabel', { count: s.streak })} · {t('stats.bestShort', { count: s.best })}
              </Text>
              {root.daily.bonusFreezes > 0 ? (
                <Text variant="caption" color="#FFE6F3" testID="stats-freezes">
                  {t('stats.freezes', { count: root.daily.bonusFreezes })}
                </Text>
              ) : null}
            </View>
            <Inky pose="cheer" size={92} />
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View key={d.date} style={styles.weekDay}>
                <View style={[styles.weekDot, { backgroundColor: d.done ? '#FFC93C' : 'rgba(255,255,255,0.18)' }]}>
                  {d.done ? <Icon name="flame" size={16} color="#C2410C" /> : null}
                </View>
                <Text variant="overline" color={d.date === date ? '#FFC93C' : '#FFE6F3'}>
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Enter>

      <Enter index={2} style={styles.tiles}>
        <StatTile gradient="sky" value={String(s.solved)} label={t('stats.solved')} icon="star" />
        <StatTile gradient="lagoon" value={`${Math.round(cleanShare * 100)}%`} label={t('stats.clean')} sub={t('stats.cleanSub', { count: s.clean })} ring={cleanShare} />
      </Enter>

      <Enter index={3}>
        <Card style={styles.rows}>
          <Row label={t('stats.dailies')} value={String(s.dailiesSolved)} hueIndex={4} icon="calendar" />
          <Row label={t('stats.best')} value={t('stats.days', { count: s.best })} hueIndex={1} icon="flame" />
          {s.averageMs !== null ? <Row label={t('stats.average')} value={formatDuration(s.averageMs)} hueIndex={3} icon="chart" /> : null}
        </Card>
      </Enter>

      <Enter index={4}>
        <Card style={{ gap: space.md }}>
          <Text variant="title" accessibilityRole="header">
            {t('stats.weekly')}
          </Text>
          <View style={styles.chart} accessible accessibilityLabel={t('stats.weeklyLabel', { counts: bars.join(', ') })}>
            {bars.map((n, i) => (
              <View key={i} style={styles.barCol}>
                <Text variant="caption" color="inkMuted">
                  {n}
                </Text>
                <Animated.View
                  entering={FadeInUp.delay(300 + i * motion.staggerMs * 2).springify()}
                  style={[
                    styles.bar,
                    {
                      height: 12 + (n / maxBar) * 96,
                      backgroundColor: hue(i).solid,
                      borderBottomColor: shade(hue(i).solid),
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <Text variant="caption" color="inkMuted">
            {t('stats.weeklyHint', { count: WEEKS })}
          </Text>
        </Card>
      </Enter>

      <Enter index={5}>
        <Card style={{ gap: space.md }}>
          <Text variant="title" accessibilityRole="header">
            {t('stats.authors')}
          </Text>
          {s.favouriteAuthors.length === 0 ? <Text color="inkMuted">{t('stats.noAuthors')}</Text> : <Podium authors={s.favouriteAuthors} />}
        </Card>
      </Enter>
    </Screen>
  );
}

function Flame({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={StyleSheet.absoluteFill}>
        <Icon name="flame" size={size} color="#FF6B6B" />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Float distance={2} duration={500}>
          <Icon name="flame" size={size * 0.72} color="#FF9A4D" />
        </Float>
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: size * 0.28 }]}>
        <Float distance={2} duration={420} delay={120}>
          <Icon name="flame" size={size * 0.42} color="#FFE08A" />
        </Float>
      </View>
    </View>
  );
}

function StatTile({ gradient, value, label, sub, icon, ring }: { gradient: GradientName; value: string; label: string; sub?: string; icon?: 'star'; ring?: number }) {
  const g = gradients[gradient];
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ''}`}>
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Gradient name={gradient} glows={[{ x: 85, y: 10, r: 50, color: '#FFFFFF', opacity: 0.35 }]} />
      </View>
      <View style={styles.tileTop}>
        {ring !== undefined ? (
          <ProgressRing progress={ring} size={44} stroke={6} color="#FFFFFF" track="rgba(255,255,255,0.3)" />
        ) : (
          <View style={styles.tileIcon}>
            <Icon name={icon ?? 'star'} size={22} color={g.text} />
          </View>
        )}
      </View>
      <Text variant="number" color={g.text}>
        {value}
      </Text>
      <Text variant="label" color={g.text}>
        {label}
      </Text>
      {sub ? (
        <Text variant="caption" color={g.textMuted}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Row({ label, value, hueIndex, icon }: { label: string; value: string; hueIndex: number; icon: 'calendar' | 'flame' | 'chart' }) {
  const { hue } = useTheme();
  const h = hue(hueIndex);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.rowIcon, { backgroundColor: h.tint }]}>
        <Icon name={icon} size={18} color={h.deep} />
      </View>
      <Text style={styles.flex}>{label}</Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

const PODIUM = [
  { place: 1, height: 70, hue: 3 },
  { place: 0, height: 96, hue: 1 },
  { place: 2, height: 52, hue: 5 },
] as const;

/** Top authors on a podium: 2nd, 1st, 3rd. The winner rises last. */
function Podium({ authors }: { authors: { author: string; count: number }[] }) {
  const { t } = useTranslation();
  const { hue } = useTheme();
  return (
    <View style={styles.podium}>
      {PODIUM.map(({ place, height, hue: hi }, col) => {
        const a = authors[place];
        if (!a) return <View key={place} style={styles.flex} />;
        const h = hue(hi);
        return (
          <View key={place} style={styles.podiumCol} accessible accessibilityLabel={`${a.author}: ${t('stats.authorCount', { count: a.count })}`}>
            <View style={styles.medal}>
              <Gradient name="candy" />
              <Text variant="label" color="#FFFFFF">
                {a.author
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </Text>
            </View>
            <Text variant="caption" style={styles.podiumName} numberOfLines={2}>
              {a.author}
            </Text>
            <Text variant="caption" color="inkMuted">
              {t('stats.authorCount', { count: a.count })}
            </Text>
            <Animated.View
              entering={FadeInUp.delay(400 + (place === 0 ? 3 : col) * 150).springify()}
              style={[styles.step, { height, backgroundColor: h.solid, borderBottomColor: shade(h.solid) }]}
            >
              <Text variant="title" color={h.on}>
                {place + 1}
              </Text>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  clip: { borderRadius: radius.xl, overflow: 'hidden' },
  streakCard: { borderRadius: radius.xl, padding: space.lg, gap: space.lg },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, borderRadius: radius.xl, padding: space.lg, gap: 2, minHeight: 170 },
  tileTop: { flex: 1 },
  tileIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  rows: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, gap: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', maxWidth: 40, borderRadius: 10, borderBottomWidth: 4 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4 },
  podiumName: { textAlign: 'center' },
  medal: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  step: { alignSelf: 'stretch', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomWidth: 4, alignItems: 'center', paddingTop: space.sm },
});
