import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Alert, Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HardwareKeys } from '@modules/hardware-keys';

import { E2E } from '@/config/e2e';
import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { reportQuote } from '@/game/report';
import { nextLevelRef, type PuzzleRef, refFromKey } from '@/game/session';
import { today } from '@/game/today';
import { type Completion, usePuzzleGame } from '@/game/usePuzzleGame';
import { Button, Chip, Screen, space, Text, useTheme } from '@/ui';
import { formatDuration } from '@/ui/format';
import { DifficultySheet } from '@/ui/puzzle/DifficultySheet';
import { PuzzleView } from '@/ui/puzzle/PuzzleView';
import { motion } from '@/ui/tokens';

export default function PuzzleScreen() {
  const { t } = useTranslation();
  const { key } = useLocalSearchParams<{ key: string }>();
  const ref = useMemo(() => (key ? refFromKey(key, content, today()) : null), [key]);

  if (!ref) {
    return (
      <Screen>
        <Text>{t('puzzle.notFound')}</Text>
        <Button label={t('puzzle.goHome')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  return <Puzzle key={ref.key} puzzleRef={ref} />;
}

function Puzzle({ puzzleRef }: { puzzleRef: PuzzleRef }) {
  const { t } = useTranslation();
  const { colors, reduceMotion } = useTheme();
  const levelIndex = useAppStore((s) => s.root!.progress.levelIndex);
  const [levelNumber] = useState(levelIndex + 1);
  const [sheet, setSheet] = useState(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [revealing, setRevealing] = useState(false);

  // On solve: flip letters left to right (600 ms), or a short fade with Reduce Motion, then show the solved screen.
  const onSolved = useCallback(
    (c: Completion) => {
      AccessibilityInfo.announceForAccessibility(t('puzzle.solvedAnnouncement'));
      const go = () =>
        router.replace({
          pathname: '/solved',
          params: {
            key: puzzleRef.key,
            clean: c.clean ? '1' : '0',
            streak: c.streak?.credited ? String(c.streak.state.streak) : '',
            freeze: c.streak?.freezeUsed ? '1' : '0',
          },
        });
      if (reduceMotion) {
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: motion.fadeMs, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: motion.fadeMs, useNativeDriver: true }),
        ]).start(go);
      } else {
        setRevealing(true);
        Animated.timing(reveal, { toValue: 1, duration: motion.solveRevealMs, useNativeDriver: true }).start(() =>
          setTimeout(go, 250),
        );
      }
    },
    [reduceMotion, reveal, opacity, puzzleRef.key, t],
  );
  const game = usePuzzleGame(puzzleRef, content, onSolved);

  const isArchive = puzzleRef.mode === 'daily' && puzzleRef.dailyDate !== today();
  const title =
    puzzleRef.mode === 'level'
      ? t('puzzle.levelTitle', { level: levelNumber })
      : isArchive
        ? t('puzzle.archiveTitle', { date: puzzleRef.dailyDate })
        : t('puzzle.dailyTitle');

  // Report quote (§4.3): hidden locally, listed in the next feedback email. Nothing is sent now.
  const report = () => {
    Alert.alert(t('puzzle.reportTitle'), t('puzzle.reportBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('puzzle.reportConfirm'),
        style: 'destructive',
        onPress: () => {
          const store = useAppStore.getState();
          store.update((r) => reportQuote(r, puzzleRef.quoteId));
          AccessibilityInfo.announceForAccessibility(t('puzzle.reported'));
          if (puzzleRef.mode === 'level') {
            const root = useAppStore.getState().root!;
            const next = nextLevelRef(root, content, root.settings.defaultDifficulty);
            router.replace(next ? `/puzzle/${encodeURIComponent(next.key)}` : '/');
          } else {
            Alert.alert(t('puzzle.reported'));
          }
        },
      },
    ]);
  };

  const header = (
    <View style={styles.header}>
      <Button label={t('puzzle.back')} variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Text variant="label" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {game.showTimer ? (
        <Text variant="caption" color="inkMuted" accessibilityLabel={t('puzzle.timer', { time: formatDuration(game.state.elapsedMs) })}>
          {formatDuration(game.state.elapsedMs)}
        </Text>
      ) : null}
      <Chip
        label={t(`difficulty.${game.difficulty}`)}
        accessibilityHint={t('puzzle.difficulty')}
        onPress={() => setSheet(true)}
        disabled={game.state.solved}
      />
      <Button label="⋯" variant="ghost" accessibilityLabel={t('puzzle.report')} onPress={report} testID="puzzle-menu" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <PuzzleView
        state={game.state}
        flags={game.flags}
        used={game.used}
        hintsLeft={game.hintsLeft}
        message={game.message}
        header={header}
        reveal={revealing ? reveal : undefined}
        boardOpacity={opacity}
        onSelect={game.onSelect}
        onLetter={game.onLetter}
        onDelete={game.onDelete}
        onReveal={game.onReveal}
        onCheck={game.onCheck}
      />
      {game.state.solved || sheet ? null : <HardwareKeys onKey={game.onHardwareKey} />}
      {E2E && !game.state.solved ? <Button label="e2e solve" variant="ghost" onPress={game.e2eSolve} testID="e2e-solve" /> : null}
      <DifficultySheet
        key={game.difficulty}
        visible={sheet}
        current={game.difficulty}
        onClose={() => setSheet(false)}
        onRestart={(d) => {
          setSheet(false);
          game.restartWith(d);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm },
  title: { flex: 1 },
});
