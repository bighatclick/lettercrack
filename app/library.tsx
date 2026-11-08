import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { ITEMS } from '@/engine/wardrobe';
import { library } from '@/game/awards';
import { Card, Enter, Hero, Icon, PressScale, radius, Screen, space, Tag, Text, useTheme } from '@/ui';

const initials = (name: string) => {
  const parts = name.split(/[\s,]+/).filter((w) => /^[A-Z]/.test(w));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
};

/** The Library: every solved quote adds its author's card. A full shelf unlocks a wardrobe item. */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const { colors, hue } = useTheme();
  const root = useAppStore((s) => s.root!);
  const lib = useMemo(() => library(root, content), [root]);
  const [picked, setPicked] = useState<string | null>(null);

  const hero = (
    <Hero gradient="candy" back={{ label: t('common.back'), onPress: () => router.back() }} title={t('library.title')}>
      <Tag label={t('library.count', { count: lib.collected.size, total: lib.total })} icon="book" bg="rgba(255,255,255,0.22)" fg="#FFFFFF" />
    </Hero>
  );

  return (
    <Screen hero={hero} testID="library">
      <Enter index={1}>
        <Card>
          <Text color="inkMuted">{t('library.intro')}</Text>
        </Card>
      </Enter>
      {lib.sets.map((set, si) => {
        const h = hue(si);
        const reward = ITEMS.find((i) => i.unlock.kind === 'set' && i.unlock.set === set.set);
        const shown = picked && set.authors.includes(picked) ? picked : null;
        const info = shown ? content.author(shown) : undefined;
        return (
          <Enter key={set.set} index={2 + si}>
            <Card style={styles.card} testID={`library-${set.set}`}>
              <View style={styles.head}>
                <Text variant="title" accessibilityRole="header" style={styles.flex}>
                  {t(`library.set_${set.set}`)}
                </Text>
                <Tag label={t('library.setCount', { count: set.collected, total: set.authors.length })} bg={h.tint} fg={h.deep} />
              </View>
              <View style={[styles.track, { backgroundColor: h.tint }]}>
                <View style={[styles.fill, { backgroundColor: h.solid, width: `${Math.round((set.collected / set.authors.length) * 100)}%` }]} />
              </View>
              {reward ? (
                <View style={styles.reward}>
                  <Icon name={set.done ? 'check' : 'shirt'} size={16} color={set.done ? h.deep : colors.inkMuted} />
                  <Text variant="caption" color={set.done ? h.deep : 'inkMuted'}>
                    {set.done ? `${t('library.setDone')} · ${t(`wardrobe.item_${reward.id}`)}` : t('library.reward', { item: t(`wardrobe.item_${reward.id}`) })}
                  </Text>
                </View>
              ) : null}
              <View style={styles.grid}>
                {set.authors.map((a) => {
                  const have = lib.collected.has(a);
                  const on = shown === a;
                  return have ? (
                    <PressScale
                      key={a}
                      accessibilityRole="button"
                      accessibilityLabel={a}
                      accessibilityState={{ selected: on }}
                      onPress={() => setPicked(on ? null : a)}
                      style={[styles.tile, { backgroundColor: on ? h.solid : h.tint }]}
                    >
                      <Text variant="label" color={on ? h.on : h.deep}>
                        {initials(a)}
                      </Text>
                    </PressScale>
                  ) : (
                    <View key={a} style={[styles.tile, { backgroundColor: colors.surfaceRaised }]} accessible accessibilityLabel={t('library.unknownLabel')}>
                      <Text variant="label" color="inkMuted">
                        ?
                      </Text>
                    </View>
                  );
                })}
              </View>
              {shown ? (
                <View style={[styles.detail, { backgroundColor: h.tint }]} accessible accessibilityLabel={t('library.authorLabel', { author: shown, dates: info?.dates ?? '', fact: info?.fact ?? info?.bio ?? '' })}>
                  <Text variant="label" color={h.deep}>
                    {shown}
                  </Text>
                  <Text variant="caption" color={h.deep}>
                    {info?.dates}
                  </Text>
                  {info?.bio ? <Text color={h.deep}>{info.bio}</Text> : null}
                  {info?.fact ? (
                    <Text variant="caption" color={h.deep}>
                      {t('library.didYouKnow')} {info.fact}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Enter>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  reward: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  detail: { borderRadius: radius.md, padding: space.md, gap: 4 },
});
