import { router, useLocalSearchParams } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, type HostInstance, StyleSheet, View } from 'react-native';

import { maybeShowInterstitial } from '@/ads/interstitial';
import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { noteReminderOffered, shouldOfferReminder } from '@/game/reminder';
import { noteReviewAsked, shouldAskForReview } from '@/game/review';
import { nextLevelRef, refFromKey } from '@/game/session';
import { today } from '@/game/today';
import { requestReminderPermission } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminderSync';
import { shareCard } from '@/lib/share';
import { Button, Card, Screen, space, Text } from '@/ui';
import { formatDuration } from '@/ui/format';
import { AuthorCard } from '@/ui/puzzle/AuthorCard';
import { ShareCard } from '@/ui/share/ShareCard';

export default function SolvedScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ key: string; clean?: string; streak?: string; freeze?: string; from?: string }>();
  const ref = useMemo(() => (params.key ? refFromKey(params.key, content, today()) : null), [params.key]);
  const record = useAppStore((s) => (ref ? s.root!.progress.solved[ref.quoteId] : undefined));
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

  return (
    <Screen>
      <Text variant="caption" color="inkMuted" accessibilityRole="header">
        {t('solved.title')}
      </Text>
      <Text variant="quote" testID="solved-quote">
        “{quote.text}”
      </Text>
      <Text variant="label" color="primary">
        — {quote.author}
      </Text>

      <View style={styles.badges}>
        {params.clean === '1' ? <Text color="inkMuted">✓ {t('solved.clean')}</Text> : null}
        {record?.timeMs != null ? <Text color="inkMuted">{t('solved.time', { time: formatDuration(record.timeMs) })}</Text> : null}
        {streak ? <Text color="primary">{t('solved.streakUp', { count: streak })}</Text> : null}
        {params.freeze === '1' ? <Text color="inkMuted">{t('solved.freezeUsed')}</Text> : null}
      </View>

      <AuthorCard author={quote.author} dates={quote.authorDates} bio={author?.bio} work={quote.work} year={quote.workYear} />

      {offerReminder ? (
        <Card style={styles.reminder} testID="reminder-offer">
          <Text variant="label">{t('solved.reminderTitle')}</Text>
          <Text color="inkMuted">{t('solved.reminderBody')}</Text>
          <View style={styles.row}>
            <Button label={t('solved.reminderYes')} onPress={() => answerReminder(true)} style={styles.flex} />
            <Button label={t('solved.reminderNo')} variant="secondary" onPress={() => answerReminder(false)} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      <Button label={t('solved.share')} variant="secondary" onPress={share} testID="solved-share" />
      {params.from === 'archive' ? (
        <Button label={t('solved.toArchive')} onPress={() => router.back()} />
      ) : (
        <Button label={ref.mode === 'daily' ? t('solved.toLevels') : t('solved.next')} onPress={next} disabled={busy} testID="solved-next" />
      )}
      <Button label={t('solved.home')} variant="secondary" onPress={() => router.replace('/')} />

      {/* Off-screen share card, captured at 1080×1350 when Share is tapped. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={cardRef} text={quote.text} author={quote.author} dates={quote.authorDates} footer={t('solved.shareFooter')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { gap: space.xs },
  reminder: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
