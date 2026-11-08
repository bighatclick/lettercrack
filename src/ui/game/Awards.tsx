import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { badgeGroup, type BadgeGroup } from '@/engine/badges';
import type { RankView } from '@/engine/rank';

import { Icon, type IconName } from '../fx/Icon';
import { Card } from '../primitives/Card';
import { Tag } from '../primitives/Tag';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';

const GROUP_HUE: Record<BadgeGroup, number> = { solving: 0, skill: 3, streak: 1, collecting: 4, moments: 5 };
const GROUP_ICON: Record<BadgeGroup, IconName> = { solving: 'star', skill: 'check', streak: 'flame', collecting: 'book', moments: 'trophy' };
const SPECIAL_ICON: Record<string, IconName> = {
  night_owl: 'moon',
  early_bird: 'bell',
  month_medal: 'calendar',
  daily_first: 'calendar',
  dailies_30: 'calendar',
  archive_first: 'calendar',
  sunday_first: 'calendar',
  sundays_4: 'calendar',
  letters_1000: 'chart',
  letters_5000: 'chart',
  letters_20000: 'chart',
};

/** A round badge medal. Locked badges are grey silhouettes with a lock, to spark curiosity. */
export function BadgeMedal({ id, earned, size = 56 }: { id: string; earned: boolean; size?: number }) {
  const { colors, hue } = useTheme();
  const group = badgeGroup(id) ?? 'solving';
  const h = hue(GROUP_HUE[group]);
  const icon = SPECIAL_ICON[id] ?? GROUP_ICON[group];
  return (
    <View
      style={[
        styles.medal,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: earned ? h.solid : colors.surfaceRaised,
          borderColor: earned ? h.deep : colors.border,
        },
      ]}
    >
      <Icon name={earned ? icon : 'lock'} size={size * 0.42} color={earned ? h.on : colors.inkMuted} />
    </View>
  );
}

/** Rank name, a progress bar to the next rank and letters to go. */
export function RankCard({ rank, testID, compact }: { rank: RankView; testID?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const { hue } = useTheme();
  const h = hue(2);
  const name = t(`rank.${rank.rank}`);
  const nextLine = rank.next ? t('home.rankNext', { count: rank.toNext, rank: t(`rank.${rank.next}`) }) : t('home.rankTop');
  return (
    <Card style={styles.rankCard} testID={testID} accessible accessibilityLabel={t('home.rankLabel', { rank: name, xp: rank.xp, next: nextLine })}>
      <View style={styles.rankHead}>
        <View style={[styles.rankBadge, { backgroundColor: h.solid }]}>
          <Text variant="label" color={h.on}>
            {rank.index + 1}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="caption" color="inkMuted">
            {t('home.rankTitle')}
          </Text>
          <Text variant="title">{name}</Text>
        </View>
      </View>
      {!compact ? <Tag label={t('rank.xp', { count: rank.xp })} bg={h.tint} fg={h.deep} /> : null}
      <View style={[styles.track, { backgroundColor: h.tint }]}>
        <View style={[styles.fill, { backgroundColor: h.solid, width: `${Math.max(3, Math.round(rank.progress * 100))}%` }]} />
      </View>
      <Text variant="caption" color="inkMuted">
        {nextLine}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderBottomWidth: 5 },
  rankCard: { gap: space.sm },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rankBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  flex: { flex: 1 },
});
