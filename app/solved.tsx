import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { maybeShowInterstitial } from '@/ads/interstitial';
import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { nextLevelRef, refFromKey } from '@/game/session';
import { today } from '@/game/today';
import { Button, Screen, space, Text } from '@/ui';
import { formatDuration } from '@/ui/format';
import { AuthorCard } from '@/ui/puzzle/AuthorCard';

export default function SolvedScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ key: string; clean?: string; streak?: string; freeze?: string }>();
  const ref = useMemo(() => (params.key ? refFromKey(params.key, content, today()) : null), [params.key]);
  const record = useAppStore((s) => (ref ? s.root!.progress.solved[ref.quoteId] : undefined));
  const [busy, setBusy] = useState(false);
  const quote = ref ? content.quote(ref.quoteId) : undefined;

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

      <Button label={ref.mode === 'daily' ? t('solved.toLevels') : t('solved.next')} onPress={next} disabled={busy} testID="solved-next" />
      <Button label={t('solved.home')} variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { gap: space.xs },
});
