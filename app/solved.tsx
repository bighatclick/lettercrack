import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as StoreReview from 'expo-store-review';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, type HostInstance, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { maybeShowInterstitial } from '@/ads/interstitial';
import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { type GoalId, goalProgress } from '@/engine/goals';
import { noteReminderOffered, shouldOfferReminder } from '@/game/reminder';
import { noteReviewAsked, shouldAskForReview } from '@/game/review';
import { nextLevelRef, refFromKey } from '@/game/session';
import { dailyNumber, tomorrowFacts } from '@/game/teaser';
import { today } from '@/game/today';
import { requestReminderPermission } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminderSync';
import { shareCard } from '@/lib/share';
import { Button, Card, Confetti, Enter, Gradient, Icon, Inky, radius, Screen, space, Tag, Text, useLoop, useTheme } from '@/ui';
import { formatDuration } from '@/ui/format';
import { GoalsCard } from '@/ui/game/GoalsCard';
import { AuthorCard } from '@/ui/puzzle/AuthorCard';
import { ShareCard } from '@/ui/share/ShareCard';

const TITLE_COLORS = ['#FFC93C', '#FF7EB6', '#20C3AF', '#7FC1FF', '#FF8A80', '#FFE08A'];

export default function SolvedScreen() {
  const { t } = useTranslation();
  const { colors, hue } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    key: string;
    clean?: string;
    streak?: string;
    freeze?: string;
    from?: string;
    milestone?: string;
    freezeEarned?: string;
    goalsDone?: string;
    goalsReward?: string;
  }>();
  const ref = useMemo(() => (params.key ? refFromKey(params.key, content, today()) : null), [params.key]);
  const record = useAppStore((s) => (ref ? s.root!.progress.solved[ref.quoteId] : undefined));
  const goalsState = useAppStore((s) => s.root!.goals);
  const liveStreak = useAppStore((s) => s.root!.daily.streak);
  const [busy, setBusy] = useState(false);
  const [offerReminder, setOfferReminder] = useState(() => {
    const root = useAppStore.getState().root!;
    return params.from !== 'archive' && ref?.mode === 'daily' && shouldOfferReminder(root);
  });
  const cardRef = useRef<HostInstance>(null);
  const quote = ref ? content.quote(ref.quoteId) : undefined;
  const justSolved = params.clean !== undefined;

  // F8 review prompt: only right after a fresh hint-free solve, never after an ad (ads come after Next).
  useEffect(() => {
    if (!justSolved) return;
    const root = useAppStore.getState().root!;
    const now = Date.now();
    if (!shouldAskForReview(root, now, { cleanSolve: params.clean === '1', justShowedAd: false })) return;
    const timer = setTimeout(() => {
      StoreReview.isAvailableAsync()
        .then((ok) => {
          if (!ok) return;
          useAppStore.getState().update((r) => noteReviewAsked(r, now));
          return StoreReview.requestReview();
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [justSolved, params.clean]);

  // Daily solved: tomorrow's reminder must skip today.
  useEffect(() => {
    if (justSolved && ref?.mode === 'daily') syncReminders(t);
  }, [justSolved, ref?.mode, t]);

  if (!ref || !quote) {
    return (
      <Screen>
        <Text>{t('puzzle.notFound')}</Text>
        <Button label={t('solved.home')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const author = content.author(quote.author);
  const streak = params.streak ? Number(params.streak) : null;
  const milestone = params.milestone ? Number(params.milestone) : null;
  const date = today();
  const isTodaysDaily = ref.mode === 'daily' && ref.dailyDate === date;
  const goals = goalProgress(goalsState, date);
  const justDone = (params.goalsDone ?? '').split(',').filter(Boolean) as GoalId[];
  const teaser = isTodaysDaily ? tomorrowFacts(content, date) : null;

  // The interstitial (if one is due) happens only here, after tapping Next (hard rule 2).
  const next = async () => {
    if (busy) return;
    setBusy(true);
    const root = useAppStore.getState().root!;
    try {
      await maybeShowInterstitial(root, ref.mode);
    } catch {
      // Ad failures never block play.
    }
    const nextRef = nextLevelRef(useAppStore.getState().root!, content, root.settings.defaultDifficulty);
    if (nextRef) router.replace(`/puzzle/${encodeURIComponent(nextRef.key)}`);
    else router.replace('/');
  };

  const share = async () => {
    if (!(await shareCard(cardRef, t('solved.shareTitle')))) Alert.alert(t('solved.shareFailed'));
  };

  // Spoiler-free result line for messages (the image card shows the quote itself).
  const shareResult = async () => {
    const parts = [
      t('solved.shareLine', { number: dailyNumber(date), difficulty: t(`difficulty.${record?.difficulty ?? 'medium'}`) }),
      record?.clean ? t('solved.shareClean') : null,
      liveStreak > 1 ? t('solved.shareStreak', { count: liveStreak }) : null,
    ].filter(Boolean);
    try {
      await Share.share({ message: `${parts.join(' · ')}
${t('solved.shareInvite')}` });
    } catch {
      Alert.alert(t('solved.shareFailed'));
    }
  };

  const answerReminder = async (yes: boolean) => {
    setOfferReminder(false);
    useAppStore.getState().update(noteReminderOffered);
    if (!yes) return;
    if (await requestReminderPermission()) {
      useAppStore.getState().setSetting('dailyReminder', true);
      syncReminders(t);
    } else {
      Alert.alert(t('solved.reminderDenied'));
    }
  };

  const celebrate = t('solved.celebrate');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Gradient
        name="night"
        direction="vertical"
        glows={[
          { x: 50, y: 18, r: 55, color: '#FFC93C', opacity: 0.35 },
          { x: 0, y: 60, r: 45, color: '#20C3AF', opacity: 0.25 },
          { x: 100, y: 85, r: 45, color: '#FF6B6B', opacity: 0.25 },
        ]}
      />
      <Rays />
      <Confetti height={height} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.inner}>
          <View style={styles.mascotRow}>
            <Inky pose="cheer" size={150} />
            <Enter kind="pop" index={6} style={styles.seal}>
              <Seal />
            </Enter>
          </View>

          <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel={celebrate}>
            {celebrate.split('').map((ch, i) => (
              <Enter key={i} kind="pop" index={2 + i}>
                <Text variant="hero" color={ch === ' ' ? 'transparent' : (TITLE_COLORS[i % TITLE_COLORS.length] as string)} style={styles.titleLetter}>
                  {ch === ' ' ? ' ' : ch}
                </Text>
              </Enter>
            ))}
          </View>

          <View style={styles.badges}>
            {params.clean === '1' ? <Tag label={t('solved.clean')} icon="check" bg="#20C3AF" fg="#0E2E2A" /> : null}
            {record?.timeMs != null ? (
              <Tag label={t('solved.time', { time: formatDuration(record.timeMs) })} bg="rgba(255,255,255,0.2)" fg="#FFFFFF" />
            ) : null}
            {streak ? <Tag label={t('solved.streakUp', { count: streak })} icon="flame" bg="#FFC93C" fg="#1E1B3A" /> : null}
            {params.freeze === '1' ? <Tag label={t('solved.freezeUsed')} bg="rgba(255,255,255,0.2)" fg="#FFFFFF" /> : null}
          </View>

          {milestone ? (
            <Enter kind="pop" index={7}>
              <Card style={styles.milestone} testID="solved-milestone">
                <View style={[styles.flameBadge, { backgroundColor: colors.accent }]}>
                  <Icon name="flame" color={colors.onAccent} size={34} />
                </View>
                <Text variant="display" style={styles.center}>
                  {t('solved.milestoneTitle', { count: milestone })}
                </Text>
                <Text color="inkMuted" style={styles.center}>
                  {t('solved.milestoneBody')}
                </Text>
                {params.freezeEarned === '1' ? (
                  <View style={[styles.note, { backgroundColor: hue(3).tint }]}>
                    <Icon name="star" color={hue(3).deep} size={18} />
                    <Text variant="caption" color={hue(3).deep} style={styles.flex}>
                      {t('solved.milestoneFreeze')}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </Enter>
          ) : null}

          <Enter index={8} style={styles.stack}>
            <View style={[styles.paper, styles.paperBack, { backgroundColor: '#4DA3FF' }]} />
            <View style={[styles.paper, styles.paperMid, { backgroundColor: '#FFC93C' }]} />
            <View style={[styles.quoteCard, { backgroundColor: colors.surface }]}>
              <Text variant="overline" color={hue(4).deep} style={styles.overline}>
                {t('solved.title').toUpperCase()}
              </Text>
              <Text variant="quote" testID="solved-quote">
                “{quote.text}”
              </Text>
              <View style={styles.authorRow}>
                <View style={styles.medal}>
                  <Gradient name="candy" />
                  <Text variant="label" color="#FFFFFF">
                    {initials(quote.author)}
                  </Text>
                </View>
                <View style={styles.authorText}>
                  <Text variant="label" color="primary">
                    {quote.author}
                  </Text>
                  <Text variant="caption" color="inkMuted">
                    {t('solved.source', { work: quote.work, year: quote.workYear })}
                  </Text>
                </View>
              </View>
            </View>
          </Enter>

          <Enter index={10}>
            <AuthorCard author={quote.author} dates={quote.authorDates} bio={author?.bio} work={quote.work} year={quote.workYear} />
          </Enter>

          {justSolved ? (
            <Enter index={11}>
              <GoalsCard goals={goals} rewarded={goalsState.date === date && goalsState.rewarded} justDone={justDone} testID="solved-goals" />
            </Enter>
          ) : null}

          {teaser ? (
            <Enter index={11}>
              <Card style={styles.teaser} testID="solved-teaser">
                <View style={styles.reminderHead}>
                  <View style={[styles.bell, { backgroundColor: hue(4).tint }]}>
                    <Icon name="calendar" color={hue(4).deep} size={20} />
                  </View>
                  <Text variant="label" style={styles.flex}>
                    {t('solved.teaserTitle')}
                  </Text>
                </View>
                <Text color="inkMuted">{t('solved.teaser', { words: teaser.words, century: teaser.century, initial: teaser.initial })}</Text>
                <View style={styles.start}>
                  <Tag label={t('solved.teaserReady')} bg={hue(4).tint} fg={hue(4).deep} />
                </View>
              </Card>
            </Enter>
          ) : null}

          {offerReminder ? (
            <Card style={styles.reminder} testID="reminder-offer">
              <View style={styles.reminderHead}>
                <View style={[styles.bell, { backgroundColor: hue(1).tint }]}>
                  <Icon name="bell" color={hue(1).deep} size={20} />
                </View>
                <Text variant="label" style={styles.flex}>
                  {t('solved.reminderTitle')}
                </Text>
              </View>
              <Text color="inkMuted">{t('solved.reminderBody')}</Text>
              <View style={styles.row}>
                <Button label={t('solved.reminderYes')} compact onPress={() => answerReminder(true)} style={styles.flex} />
                <Button label={t('solved.reminderNo')} compact variant="secondary" onPress={() => answerReminder(false)} style={styles.flex} />
              </View>
            </Card>
          ) : null}

          <Enter index={12} style={styles.actions}>
            {params.from === 'archive' ? (
              <Button label={t('solved.toArchive')} variant="sunny" icon="calendar" onPress={() => router.back()} />
            ) : (
              <Button
                label={ref.mode === 'daily' ? t('solved.toLevels') : t('solved.next')}
                variant="sunny"
                icon="play"
                onPress={next}
                disabled={busy}
                testID="solved-next"
              />
            )}
            {isTodaysDaily ? (
              <Button label={t('solved.shareResult')} variant="glass" icon="star" onPress={shareResult} testID="solved-share-result" />
            ) : null}
            <View style={styles.row}>
              <Button label={t('solved.share')} variant="glass" icon="share" onPress={share} style={styles.flex} testID="solved-share" />
              <Button label={t('solved.home')} variant="glass" icon="home" onPress={() => router.replace('/')} style={styles.flex} />
            </View>
          </Enter>
        </View>
      </ScrollView>

      {/* Off-screen share card, captured at 1080×1350 when Share is tapped. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={cardRef} text={quote.text} author={quote.author} dates={quote.authorDates} footer={t('solved.shareFooter')} />
      </View>
    </View>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/** Slowly turning light rays behind Inky. Still with Reduce Motion. */
function Rays() {
  const v = useLoop(40000, { loop: true });
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * 360}deg` }] }));
  return (
    <View style={styles.raysBox} pointerEvents="none">
      <Animated.View style={[styles.rays, anim]}>
        <Svg width={720} height={720} viewBox="-100 -100 200 200">
          {Array.from({ length: 12 }, (_, i) => (
            <Path key={i} d="M0 0 L-9 -100 L9 -100 Z" fill="#FFFFFF" opacity={0.07} rotation={i * 30} origin="0, 0" />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Coral scalloped seal with a check. */
function Seal() {
  const pts = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const r = i % 2 ? 26 : 30;
    return `${(32 + Math.cos(a) * r).toFixed(1)},${(32 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polygon points={pts} fill="#FF6B6B" />
      <Circle cx="32" cy="32" r="19" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeDasharray="3 3" />
      <Path d="M23 32.5l6 6 12-13" fill="none" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A1F6B' },
  scroll: { flexGrow: 1 },
  inner: { paddingHorizontal: space.lg, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  mascotRow: { alignItems: 'center', justifyContent: 'center' },
  seal: { position: 'absolute', right: '12%', top: 8, transform: [{ rotate: '-12deg' }] },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  titleLetter: { textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  stack: { paddingTop: space.md, paddingHorizontal: space.xs },
  paper: { position: 'absolute', left: space.md, right: space.md, top: space.md, bottom: 0, borderRadius: radius.xl },
  paperBack: { transform: [{ rotate: '4deg' }] },
  paperMid: { transform: [{ rotate: '-3deg' }] },
  quoteCard: { borderRadius: radius.xl, padding: space.xl, gap: space.md, transform: [{ rotate: '-1deg' }] },
  overline: { letterSpacing: 1.4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  medal: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  authorText: { flex: 1 },
  reminder: { gap: space.sm },
  teaser: { gap: space.sm },
  start: { alignSelf: 'flex-start' },
  milestone: { gap: space.sm, alignItems: 'center' },
  flameBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  raysBox: { position: 'absolute', top: -180, left: 0, right: 0, alignItems: 'center' },
  rays: { width: 720, height: 720 },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
