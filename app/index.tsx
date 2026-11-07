import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { dailySeed, encrypt, makeCipherKey } from '@/engine/cipher';
import { displayStreak } from '@/engine/streak';
import { archiveMonths } from '@/game/archive';
import { needsOnboarding } from '@/game/onboarding';
import { dailyKey, dailyRef, nextLevelRef } from '@/game/session';
import { today } from '@/game/today';
import {
  Button,
  Card,
  Enter,
  Float,
  Gradient,
  Hero,
  Icon,
  Inky,
  PressScale,
  Pulse,
  radius,
  Screen,
  space,
  Tag,
  Text,
  useTheme,
  Wiggle,
} from '@/ui';
import { shade } from '@/ui/color';
import { fontFamily, type GradientName, gradients } from '@/ui/tokens';

/** Home (S1): today's quote, the level path, archive, stats and settings. No ads. */
export default function Home() {
  const { t, i18n } = useTranslation();
  const { colors, hue } = useTheme();
  const root = useAppStore((s) => s.root!);
  const status = useAppStore((s) => s.loadStatus);
  const date = today();
  const key = dailyKey(date);
  const solvedToday = root.daily.solvedDates.includes(date);
  const inProgress = !!root.inProgress[key];
  const streak = displayStreak(root.daily, date);
  const levelRef = nextLevelRef(root, content, root.settings.defaultDifficulty);
  const level = root.progress.levelIndex + 1;

  const preview = todayPreview(date);
  const toPlay = archiveMonths(root, content, date).reduce((sum, m) => sum + m.days.filter((d) => d.status !== 'solved').length, 0);

  if (needsOnboarding(root)) return <Redirect href="/onboarding" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.greetMorning') : hour < 18 ? t('home.greetAfternoon') : t('home.greetEvening');
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const bubble = solvedToday ? t('home.inkySolved') : inProgress ? t('home.inkyResume') : t('home.inkyReady');

  const hero = (
    <Hero
      gradient="night"
      overline={dateLabel}
      title={greeting}
      action={{ icon: 'gear', label: t('home.settings'), onPress: () => router.push('/settings'), testID: 'home-settings' }}
      side={<Inky pose="wave" size={118} />}
    >
      <View style={styles.heroRow}>
        {streak > 0 ? (
          <Enter kind="pop" index={2}>
            <Tag label={t('home.streak', { count: streak })} icon="flame" bg={colors.accent} fg={colors.onAccent} />
          </Enter>
        ) : null}
        <Enter kind="pop" index={3} style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            <Text variant="caption" color="#2A1F6B">
              {bubble}
            </Text>
          </View>
        </Enter>
      </View>
    </Hero>
  );

  return (
    <Screen hero={hero}>
      {status === 'recoveredFromBackup' ? <Text color="inkMuted">{t('common.dataRecovered')}</Text> : null}

      <Enter index={1}>
        <Card style={styles.daily}>
          <View style={styles.tags}>
            <Tag label={t('home.title').toUpperCase()} bg={hue(4).tint} fg={hue(4).deep} />
            {preview ? <Tag label={t(`difficulty.${root.inProgress[key]?.difficulty ?? root.settings.defaultDifficulty}`)} bg={hue(2).tint} fg={hue(2).deep} /> : null}
            {preview ? <Tag label={t('home.letters', { count: preview.letters })} bg={hue(0).tint} fg={hue(0).deep} /> : null}
          </View>
          {preview ? (
            <View style={styles.tiles} accessible accessibilityLabel={t('home.previewLabel')}>
              {preview.words.map((w, wi) => (
                <View key={wi} style={styles.word}>
                  {w.split('').map((ch, ci) => (
                    <Enter key={ci} kind="pop" index={4 + wi * 2 + ci}>
                      <View style={[styles.tile, { backgroundColor: hue(wi).solid, borderBottomColor: shade(hue(wi).solid) }]}>
                        <Text allowFontScaling={false} style={[styles.tileText, { color: hue(wi).on }]}>
                          {ch}
                        </Text>
                      </View>
                    </Enter>
                  ))}
                </View>
              ))}
              {preview.more ? (
                <Text variant="title" color="inkMuted" style={styles.ellipsis}>
                  …
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text color="inkMuted">
            {solvedToday ? t('home.dailySolved') : inProgress ? t('home.dailyInProgress') : t('home.dailyLocked')}
          </Text>
          {solvedToday ? (
            <Button
              label={t('home.viewSolved')}
              variant="secondary"
              icon="check"
              onPress={() => router.push({ pathname: '/solved', params: { key } })}
            />
          ) : (
            <Button
              label={inProgress ? t('home.resume') : t('home.play')}
              icon="play"
              onPress={() => router.push(`/puzzle/${encodeURIComponent(key)}`)}
              testID="home-daily"
            />
          )}
        </Card>
      </Enter>

      <Enter index={2}>
        <Card style={styles.levels}>
          <View style={styles.levelHead}>
            <Text variant="title">{t('home.levels')}</Text>
            <Tag label={t('home.levelNow', { level })} bg={hue(0).tint} fg={hue(0).deep} />
          </View>
          <LevelPath current={level} />
          {levelRef ? (
            <Button
              label={t('home.continueLevel', { level })}
              variant="coral"
              icon="play"
              onPress={() => router.push(`/puzzle/${encodeURIComponent(levelRef.key)}`)}
              testID="home-level"
            />
          ) : (
            <Text color="inkMuted">{t('home.noLevels')}</Text>
          )}
        </Card>
      </Enter>

      <Enter index={3} style={styles.links}>
        <BigTile
          gradient="lagoon"
          icon="calendar"
          title={t('home.archive')}
          subtitle={toPlay > 0 ? t('home.archiveToPlay', { count: toPlay }) : t('home.archiveSub')}
          onPress={() => router.push('/archive')}
          testID="home-archive"
        />
        <BigTile
          gradient="sunshine"
          icon="chart"
          title={t('home.stats')}
          subtitle={t('home.statsSub', { count: Object.keys(root.progress.solved).length })}
          onPress={() => router.push('/stats')}
          testID="home-stats"
          bars
        />
      </Enter>
    </Screen>
  );
}

/** Today's quote, still in cipher (no spoilers): the first few words, shown as coloured tiles. */
function todayPreview(date: string) {
  const ref = dailyRef(date, content, date);
  const q = ref ? content.quote(ref.quoteId) : undefined;
  if (!q) return null;
  const words = encrypt(q.text, makeCipherKey(dailySeed(date)))
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z]/g, ''))
    .filter(Boolean);
  const shown: string[] = [];
  let n = 0;
  for (const w of words) {
    if (n + w.length > 16 && shown.length) break;
    shown.push(w);
    n += w.length;
  }
  return { words: shown, letters: q.text.replace(/[^a-z]/gi, '').length, difficulty: q.difficulty, more: shown.length < words.length };
}

/** A winding path of level nodes: done, current (pulsing) and the next few (locked). */
function LevelPath({ current }: { current: number }) {
  const { colors, hue } = useTheme();
  const first = Math.max(1, current - 2);
  const nodes = Array.from({ length: 6 }, (_, i) => first + i);
  const ys = [26, 10, 26, 10, 26, 10];
  return (
    <View style={styles.path} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 64" preserveAspectRatio="none">
        <Path d="M25 44 C 50 10, 75 10, 75 28 S 100 46, 125 44 S 150 10, 175 28 S 200 46, 225 44 S 260 10, 275 28" stroke={colors.border} strokeWidth={6} strokeDasharray="2 10" strokeLinecap="round" fill="none" />
      </Svg>
      {nodes.map((n, i) => {
        const done = n < current;
        const now = n === current;
        const h = hue(n % 2 ? 2 : 3);
        const node = (
          <View
            style={[
              styles.node,
              done
                ? { backgroundColor: h.solid, borderBottomColor: shade(h.solid) }
                : now
                  ? { backgroundColor: hue(0).solid, borderBottomColor: shade(hue(0).solid), width: 46, height: 46 }
                  : { backgroundColor: colors.surfaceRaised, borderBottomColor: colors.border },
            ]}
          >
            {done ? (
              <Icon name="check" size={18} color={h.on} strokeWidth={3.2} />
            ) : now ? (
              <Text variant="label" color={hue(0).on}>
                {n}
              </Text>
            ) : (
              <Icon name="lock" size={14} color={colors.inkMuted} />
            )}
          </View>
        );
        return (
          <View key={n} style={[styles.nodeSlot, { marginTop: ys[i] }]}>
            {now ? <Pulse>{node}</Pulse> : node}
          </View>
        );
      })}
    </View>
  );
}

function BigTile({
  gradient,
  icon,
  title,
  subtitle,
  onPress,
  testID,
  bars,
}: {
  gradient: GradientName;
  icon: 'calendar' | 'chart';
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
  bars?: boolean;
}) {
  const g = gradients[gradient];
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={styles.bigTile} testID={testID}>
      <View style={[StyleSheet.absoluteFill, styles.bigClip]}>
        <Gradient name={gradient} glows={[{ x: 85, y: 10, r: 50, color: '#FFFFFF', opacity: 0.35 }]} />
      </View>
      <View style={styles.bigTop}>
        <Wiggle>
          <View style={styles.bigIcon}>
            <Icon name={icon} color={g.text} size={24} />
          </View>
        </Wiggle>
        {bars ? (
          <View style={styles.miniBars}>
            {[14, 24, 18, 30].map((hgt, i) => (
              <Float key={i} distance={3} duration={900 + i * 150} delay={i * 120}>
                <View style={[styles.miniBar, { height: hgt, backgroundColor: ['#FF6B6B', '#6D3FE0', '#20C3AF', '#4DA3FF'][i] }]} />
              </Float>
            ))}
          </View>
        ) : null}
      </View>
      <Text variant="title" color={g.text}>
        {title}
      </Text>
      <Text variant="caption" color={g.textMuted}>
        {subtitle}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  bubbleWrap: { flexShrink: 1 },
  bubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
  },
  daily: { gap: space.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'flex-end' },
  word: { flexDirection: 'row', gap: 4 },
  tile: { width: 28, height: 34, borderRadius: 8, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fontFamily.mono, fontSize: 17 },
  ellipsis: { marginBottom: 2 },
  levels: { gap: space.md },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  path: { height: 84, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs },
  nodeSlot: { width: 48, alignItems: 'center' },
  node: { width: 38, height: 38, borderRadius: 999, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', gap: space.md },
  bigTile: { flex: 1, minHeight: 150, borderRadius: radius.xl, padding: space.lg, gap: 2, justifyContent: 'flex-end' },
  bigClip: { borderRadius: radius.xl, overflow: 'hidden' },
  bigTop: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bigIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 34 },
  miniBar: { width: 8, borderRadius: 4 },
});
