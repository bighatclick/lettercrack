import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HardwareKeys, type HardwareKey } from '@modules/hardware-keys';

import { useAppStore } from '@/data/store';
import { createPuzzle, type Difficulty, type PuzzleAction, puzzleReducer, usedLetters } from '@/engine/puzzle';
import { cellFlags } from '@/game/flags';
import { completeOnboarding, onboardingInit } from '@/game/onboarding';
import { Button, Enter, FloatingLetters, Gradient, Inky, PressScale, radius, space, Text, useTheme } from '@/ui';
import { shade } from '@/ui/color';
import { DIFF_HUE } from '@/ui/puzzle/DifficultySheet';
import { PuzzleView } from '@/ui/puzzle/PuzzleView';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Onboarding (S8): one tiny puzzle ("A CAT"), then the difficulty picker. No permission prompts. */
export default function Onboarding() {
  const { t } = useTranslation();
  const { colors, hue, isDark } = useTheme();
  const autoFill = useAppStore((s) => s.root!.settings.autoFill);
  const [state, setState] = useState(() => createPuzzle(onboardingInit(autoFill)));
  const [step, setStep] = useState<'puzzle' | 'pick'>('puzzle');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const keyId = useRef(0);

  const apply = useCallback((a: PuzzleAction) => setState((s) => puzzleReducer(s, a)), []);
  const onLetter = useCallback((letter: string) => apply({ type: 'input', letter, keyId: ++keyId.current }), [apply]);
  const onDelete = useCallback(() => apply({ type: 'erase', keyId: ++keyId.current }), [apply]);
  const onKey = useCallback(
    (k: HardwareKey) => {
      if (k === 'Backspace') onDelete();
      else if (k === 'ArrowLeft') apply({ type: 'move', delta: -1 });
      else if (k === 'ArrowRight') apply({ type: 'move', delta: 1 });
      else onLetter(k);
    },
    [apply, onDelete, onLetter],
  );
  const flags = useMemo(() => cellFlags(state, true), [state]);
  const used = useMemo(() => usedLetters(state), [state]);

  const finish = (d: Difficulty) => {
    useAppStore.getState().update((r) => completeOnboarding(r, d, Date.now()));
    router.replace('/');
  };

  if (step === 'pick') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Gradient name="night" direction="vertical" glows={[{ x: 50, y: 20, r: 60, color: '#FFC93C', opacity: 0.3 }, { x: 0, y: 90, r: 50, color: '#FF7EB6', opacity: 0.3 }]} />
        <FloatingLetters colors={['#FFC93C', '#FF7EB6', '#20C3AF', '#FFFFFF']} />
        <SafeAreaView style={styles.pick}>
          <Enter kind="pop" style={styles.center}>
            <Inky pose="cheer" size={140} />
          </Enter>
          <Enter index={1}>
            <Text variant="display" color="#FFFFFF" accessibilityRole="header" style={styles.centerText}>
              {t('onboarding.pick')}
            </Text>
          </Enter>
          <Enter index={2}>
            <Text color="#E4DCFF" style={styles.centerText}>
              {t('onboarding.pickHint')}
            </Text>
          </Enter>
          <View style={styles.levels} accessibilityRole="radiogroup">
            {DIFFICULTIES.map((d, i) => {
              const h = hue(DIFF_HUE[d]);
              const on = difficulty === d;
              return (
                <Enter key={d} index={3 + i} style={styles.levelWrap}>
                  <PressScale
                    accessibilityRole="radio"
                    accessibilityLabel={t(`difficulty.${d}`)}
                    accessibilityState={{ selected: on, checked: on }}
                    onPress={() => setDifficulty(d)}
                    testID={`onboarding-${d}`}
                    style={[
                      styles.level,
                      { backgroundColor: on ? h.solid : 'rgba(255,255,255,0.12)', borderColor: on ? '#FFFFFF' : 'rgba(255,255,255,0.3)', borderBottomColor: on ? shade(h.solid) : 'rgba(255,255,255,0.3)' },
                    ]}
                  >
                    <View style={styles.dots}>
                      {[0, 1, 2, 3].map((k) => (
                        <View key={k} style={[styles.dot, { backgroundColor: k <= i ? (on ? h.on : h.solid) : 'rgba(255,255,255,0.3)' }]} />
                      ))}
                    </View>
                    <Text variant="label" color={on ? h.on : '#FFFFFF'}>
                      {t(`difficulty.${d}`)}
                    </Text>
                  </PressScale>
                </Enter>
              );
            })}
          </View>
          <Enter index={8}>
            <Button label={t('onboarding.start')} variant="sunny" icon="play" onPress={() => finish(difficulty)} testID="onboarding-start" />
          </Enter>
        </SafeAreaView>
      </View>
    );
  }

  const header = (
    <View style={styles.intro}>
      <View style={styles.introRow}>
        <Inky pose={state.solved ? 'cheer' : 'wave'} size={96} />
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <Text variant="title" accessibilityRole="header">
            {t('onboarding.title')}
          </Text>
          <Text variant="caption" color="inkMuted">
            {t('onboarding.intro')}
          </Text>
        </View>
      </View>
      <View style={[styles.task, { backgroundColor: state.solved ? hue(2).tint : hue(1).tint }]}>
        <Text variant="caption" color={state.solved ? hue(2).deep : hue(1).deep}>
          {state.solved ? t('onboarding.solved') : `${t('onboarding.tryIt')} ${t('onboarding.hint')}`}
        </Text>
      </View>
      {state.solved ? <Button label={t('solved.next')} variant="primary" icon="play" onPress={() => setStep('pick')} testID="onboarding-next" /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surfaceRaised }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.skip}>
        <Button label={t('onboarding.skip')} variant="ghost" compact onPress={() => setStep('pick')} testID="onboarding-skip" />
      </View>
      <View style={styles.headerWrap}>{header}</View>
      <PuzzleView
        state={state}
        flags={flags}
        used={used}
        hintsLeft={0}
        message={null}
        hideHints
        onSelect={(index) => apply({ type: 'select', index })}
        onLetter={onLetter}
        onDelete={onDelete}
        onReveal={() => {}}
        onCheck={() => {}}
      />
      {state.solved ? null : <HardwareKeys onKey={onKey} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A1F6B' },
  skip: { alignItems: 'flex-end', paddingHorizontal: space.sm },
  headerWrap: { paddingHorizontal: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  intro: { gap: space.sm },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { flex: 1, padding: space.md, borderRadius: radius.lg, borderBottomLeftRadius: 4, gap: 2 },
  task: { padding: space.md, borderRadius: radius.md },
  pick: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  levelWrap: { width: '47%', flexGrow: 1 },
  level: { minHeight: 76, borderRadius: radius.lg, borderWidth: 2, borderBottomWidth: 5, padding: space.md, gap: space.sm, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
