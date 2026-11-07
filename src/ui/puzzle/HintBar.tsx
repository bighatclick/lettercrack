import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '../fx/Icon';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { space } from '../tokens';

export type HintBarProps = {
  hintsLeft: number;
  canCheck: boolean;
  onReveal: () => void;
  onCheck: () => void;
};

export function HintBar({ hintsLeft, canCheck, onReveal, onCheck }: HintBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const none = hintsLeft === 0;
  return (
    <View style={styles.bar}>
      <Button
        label={t('puzzle.reveal')}
        variant="sky"
        icon="bulb"
        compact
        onPress={onReveal}
        disabled={none}
        accessibilityHint={t('puzzle.revealHint')}
        style={styles.btn}
        testID="hint-reveal"
      />
      <Button
        label={t('puzzle.check')}
        variant="teal"
        icon="search"
        compact
        onPress={onCheck}
        disabled={none || !canCheck}
        accessibilityHint={t('puzzle.checkHint')}
        style={styles.btn}
        testID="hint-check"
      />
      <View style={styles.count} accessible accessibilityLiveRegion="polite" accessibilityLabel={none ? t('puzzle.noHints') : t('puzzle.hintsLeft', { count: hintsLeft })}>
        {none ? (
          <Text variant="caption" color="inkMuted" style={styles.noneText}>
            {t('puzzle.noHints')}
          </Text>
        ) : (
          <>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Icon name="bulb" color={colors.onAccent} size={16} strokeWidth={2.6} />
            </View>
            <Text variant="label" color="ink">
              ×{hintsLeft}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  btn: { paddingHorizontal: space.lg },
  count: { flexShrink: 1, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  noneText: { textAlign: 'right', flexShrink: 1 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
