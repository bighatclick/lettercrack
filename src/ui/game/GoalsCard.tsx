import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { GoalId, GoalView } from '@/engine/goals';

import { Icon } from '../fx/Icon';
import { Enter } from '../fx/motion';
import { Card } from '../primitives/Card';
import { Tag } from '../primitives/Tag';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';

/**
 * Today's three goals with progress. Finishing all three earns a hint.
 * `justDone` highlights goals completed by the solve that was just made (Solved screen).
 */
export function GoalsCard({
  goals,
  rewarded,
  justDone = [],
  testID,
}: {
  goals: GoalView[];
  rewarded: boolean;
  justDone?: readonly GoalId[];
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors, hue } = useTheme();
  const doneCount = goals.filter((g) => g.done).length;
  return (
    <Card style={styles.card} testID={testID}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: hue(1).solid }]}>
          <Icon name="star" color={hue(1).on} size={18} />
        </View>
        <Text variant="title" style={styles.flex} accessibilityRole="header">
          {t('home.goalsTitle')}
        </Text>
        <Tag label={`${doneCount}/${goals.length}`} bg={hue(1).tint} fg={hue(1).deep} />
      </View>
      {goals.map((g, i) => {
        const h = hue(i === 0 ? 4 : i === 1 ? 2 : 0);
        const label = t(`goals.${g.id}`);
        const fresh = justDone.includes(g.id);
        // The "Done!" tag is inside the row's single accessibility element, so say it in the label too.
        const a11y = fresh
          ? t('goals.a11yJustDone', { goal: label })
          : g.done
            ? t('goals.a11yDone', { goal: label })
            : t('goals.a11y', { goal: label, value: g.value, target: g.target });
        return (
          <View key={g.id} style={styles.row} accessible accessibilityLabel={a11y}>
            <View
              style={[
                styles.check,
                g.done ? { backgroundColor: h.solid, borderColor: h.solid } : { backgroundColor: h.tint, borderColor: h.deep },
              ]}
            >
              {g.done ? <Icon name="check" color={h.on} size={16} strokeWidth={3} /> : null}
            </View>
            <View style={styles.flex}>
              <Text variant="label" color={g.done ? 'inkMuted' : 'ink'}>
                {label}
              </Text>
              {g.target > 1 && !g.done ? (
                <View style={[styles.track, { backgroundColor: h.tint }]}>
                  <View style={[styles.fill, { backgroundColor: h.solid, width: `${Math.round((g.value / g.target) * 100)}%` }]} />
                </View>
              ) : null}
            </View>
            {fresh ? (
              <Enter kind="pop" index={i + 2}>
                <Tag label={t('goals.justDone')} bg={h.solid} fg={h.on} />
              </Enter>
            ) : g.target > 1 && !g.done ? (
              <Text variant="caption" color="inkMuted">
                {t('goals.progress', { value: g.value, target: g.target })}
              </Text>
            ) : null}
          </View>
        );
      })}
      <View style={[styles.reward, { backgroundColor: rewarded ? hue(2).tint : colors.surfaceRaised }]}>
        <Icon name="bulb" color={rewarded ? hue(2).deep : colors.primary} size={18} />
        <Text variant="caption" color={rewarded ? hue(2).deep : colors.primary} style={styles.flex}>
          {rewarded ? t('home.goalsRewarded') : t('home.goalsReward')}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: radius.pill, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  reward: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  flex: { flex: 1 },
});
