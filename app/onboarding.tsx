import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HardwareKeys, type HardwareKey } from '@modules/hardware-keys';

import { useAppStore } from '@/data/store';
import { createPuzzle, type Difficulty, type PuzzleAction, puzzleReducer, usedLetters } from '@/engine/puzzle';
import { cellFlags } from '@/game/flags';
import { completeOnboarding, onboardingInit } from '@/game/onboarding';
import { Button, Card, Chip, space, Text, useTheme } from '@/ui';
import { PuzzleView } from '@/ui/puzzle/PuzzleView';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Onboarding (S8): one tiny puzzle ("A CAT"), then the difficulty picker. No permission prompts. */
export default function Onboarding() {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={styles.pick}>
          <Text variant="title" accessibilityRole="header">
            {t('onboarding.pick')}
          </Text>
          <Text color="inkMuted">{t('onboarding.pickHint')}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} label={t(`difficulty.${d}`)} selected={difficulty === d} onPress={() => setDifficulty(d)} testID={`onboarding-${d}`} />
            ))}
          </View>
          <Button label={t('onboarding.start')} onPress={() => finish(difficulty)} testID="onboarding-start" />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <Card style={styles.intro}>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.title')}
      </Text>
      <Text>{t('onboarding.intro')}</Text>
      <Text color="inkMuted">{state.solved ? t('onboarding.solved') : `${t('onboarding.tryIt')} ${t('onboarding.hint')}`}</Text>
      {state.solved ? <Button label={t('solved.next')} onPress={() => setStep('pick')} testID="onboarding-next" /> : null}
    </Card>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.skip}>
        <Button label={t('onboarding.skip')} variant="ghost" onPress={() => setStep('pick')} testID="onboarding-skip" />
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
  root: { flex: 1 },
  skip: { alignItems: 'flex-end', paddingHorizontal: space.sm },
  headerWrap: { paddingHorizontal: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  intro: { gap: space.sm },
  pick: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
