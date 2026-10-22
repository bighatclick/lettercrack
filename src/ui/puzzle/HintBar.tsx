import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';
import { space } from '../tokens';

export type HintBarProps = {
  hintsLeft: number;
  canCheck: boolean;
  onReveal: () => void;
  onCheck: () => void;
};

export function HintBar({ hintsLeft, canCheck, onReveal, onCheck }: HintBarProps) {
  const { t } = useTranslation();
  const none = hintsLeft === 0;
  return (
    <View style={styles.bar}>
      <Button
        label={t('puzzle.reveal')}
        variant="secondary"
        onPress={onReveal}
        disabled={none}
        accessibilityHint={t('puzzle.revealHint')}
        style={styles.btn}
        testID="hint-reveal"
      />
      <Button
        label={t('puzzle.check')}
        variant="secondary"
        onPress={onCheck}
        disabled={none || !canCheck}
        accessibilityHint={t('puzzle.checkHint')}
        style={styles.btn}
        testID="hint-check"
      />
      <Text variant="caption" color="inkMuted" style={styles.count} accessibilityLiveRegion="polite">
        {none ? t('puzzle.noHints') : t('puzzle.hintsLeft', { count: hintsLeft })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  btn: { paddingHorizontal: space.lg },
  count: { flexShrink: 1, flexGrow: 1, textAlign: 'right' },
});
