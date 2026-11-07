import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { Difficulty } from '@/engine/puzzle';

import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { Chip } from '../primitives/Chip';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { space } from '../tokens';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
/** easy = teal, medium = sky, hard = coral, expert = violet. */
export const DIFF_HUE: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 0, expert: 4 };

export function DifficultySheet(props: {
  visible: boolean;
  current: Difficulty;
  onRestart: (d: Difficulty) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [pick, setPick] = useState(props.current);
  const { hue } = useTheme();
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.scrim} onPress={props.onClose} accessibilityLabel={t('puzzle.cancel')} />
      <View style={styles.center} pointerEvents="box-none">
        <Card style={styles.card} accessibilityViewIsModal>
          <Text variant="title" accessibilityRole="header">
            {t('puzzle.difficulty')}
          </Text>
          <View style={styles.row}>
            {LEVELS.map((d) => (
              <Chip key={d} label={t(`difficulty.${d}`)} hue={hue(DIFF_HUE[d])} selected={pick === d} onPress={() => setPick(d)} />
            ))}
          </View>
          <Text color="inkMuted">{t('puzzle.difficultyChange')}</Text>
          <View style={styles.row}>
            <Button label={t('puzzle.cancel')} variant="ghost" compact onPress={props.onClose} />
            <Button label={t('puzzle.restart')} compact onPress={() => props.onRestart(pick)} disabled={pick === props.current} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,17,43,0.55)' },
  center: { flex: 1, justifyContent: 'center', padding: space.lg },
  card: { gap: space.lg, width: '100%', maxWidth: 480, alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'flex-end' },
});
