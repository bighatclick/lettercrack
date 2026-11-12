import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Alert, Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HardwareKeys } from '@modules/hardware-keys';

import { E2E } from '@/config/e2e';
import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { reportQuote } from '@/game/report';
import { nextLevelRef, type PuzzleRef, refForPlayer } from '@/game/session';
import { today } from '@/game/today';
import { type Completion, usePuzzleGame } from '@/game/usePuzzleGame';
import { Button, Chip, Icon, type IconName, PressScale, ProgressRing, radius, Screen, softShadow, space, Text, useTheme } from '@/ui';
import { formatDuration, formatLocalDate } from '@/ui/format';
import { DifficultySheet } from '@/ui/puzzle/DifficultySheet';
import { PuzzleView } from '@/ui/puzzle/PuzzleView';
import { motion, typeScale } from '@/ui/tokens';

export default function PuzzleScreen() {
  const { t } = useTranslation();
  const { key } = useLocalSearchParams<{ key: string }>();
  const ref = useMemo(() => (key ? refForPlayer(key, useAppStore.getState().root!, content, today()) : null), [key]);

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
  const { t, i18n } = useTranslation();
  const { colors, hue, isDark, reduceMotion } = useTheme();
  const levelIndex = useAppStore((s) => s.root!.progress.levelIndex);
  const [levelNumber] = useState(levelIndex + 1);
  const [sheet, setSheet] = useState(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [revealing, setRevealing] = useState(false);

  const isArchive = puzzleRef.mode === 'daily' && puzzleRef.dailyDate !== today();
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
            milestone: c.streak?.milestone ? String(c.streak.milestone) : '',
            freezeEarned: c.streak?.freezeEarned ? '1' : '0',
            goalsDone: c.goals?.completed.join(',') ?? '',
            goalsReward: c.goals?.rewardNow ? '1' : '0',
            newAuthor: c.newAuthor ? '1' : '0',
            items: c.newItems.join(','),
            // An archive day goes back to the archive, not on to the level path.
            ...(isArchive ? { from: 'archive' } : {}),
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
    [reduceMotion, reveal, opacity, puzzleRef.key, isArchive, t],
  );
  const game = usePuzzleGame(puzzleRef, content, onSolved);

  const title =
    puzzleRef.mode === 'level'
      ? t('puzzle.levelTitle', { level: levelNumber })
      : isArchive
        ? t('puzzle.archiveTitle', { date: formatLocalDate(puzzleRef.dailyDate!, i18n.language) })
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

  const letterCells = game.state.plain.split('').filter((ch) => ch >= 'A' && ch <= 'Z').length;
  const filledCells = game.state.entries.filter((e) => e !== '').length;
  const progress = letterCells ? filledCells / letterCells : 0;
  const diffHue = hue({ easy: 2, medium: 3, hard: 0, expert: 4 }[game.difficulty]);

  const header = (
    <View style={styles.header}>
      <CircleButton icon="back" label={t('puzzle.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={styles.titleBox}>
        <Text variant="title" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subRow}>
          <Chip
            label={t(`difficulty.${game.difficulty}`)}
            hue={diffHue}
            accessibilityHint={t('puzzle.difficulty')}
            onPress={() => setSheet(true)}
            disabled={game.state.solved}
          />
          {game.showTimer ? (
            <Text variant="caption" color="inkMuted" accessibilityLabel={t('puzzle.timer', { time: formatDuration(game.state.elapsedMs) })}>
              {formatDuration(game.state.elapsedMs)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.ring} accessible accessibilityLabel={t('puzzle.progress', { filled: filledCells, total: letterCells })}>
        <ProgressRing progress={progress} size={46} stroke={5} color={hue(0).solid} track={colors.border} />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.ringText}>
            {/* Fixed size: the ring does not grow with text size, and its spoken label carries the value. */}
            <Text variant="overline" color="ink" allowFontScaling={false} style={styles.ringLabel}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </View>
      <CircleButton icon="more" label={t('puzzle.report')} onPress={report} testID="puzzle-menu" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surfaceRaised }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
        tip={t(`puzzle.tip${puzzleRef.quoteId % TIP_COUNT}`)}
      />
      {game.state.solved || sheet ? null : <HardwareKeys onKey={game.onHardwareKey} />}
      {E2E && !game.state.solved ? (
        <View style={styles.e2e}>
          <Button label="e2e solve" variant="ghost" compact onPress={game.e2eSolve} testID="e2e-solve" />
          <Button label="e2e wrong" variant="ghost" compact onPress={game.e2eWrong} testID="e2e-wrong" />
          <Button label="e2e right" variant="ghost" compact onPress={game.e2eRight} testID="e2e-right" />
          <Button label="e2e almost" variant="ghost" compact onPress={game.e2eAlmost} testID="e2e-almost" />
        </View>
      ) : null}
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

const TIP_COUNT = 6;

/** Round white icon button for light backgrounds. */
function CircleButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={[styles.circle, softShadow(colors.shadow, 3), { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Icon name={icon} color={colors.ink} size={22} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.xs },
  titleBox: { flex: 1, gap: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ring: { width: 46, height: 46 },
  ringText: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontSize: typeScale.overline.fontSize, lineHeight: typeScale.overline.lineHeight },
  circle: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  e2e: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
