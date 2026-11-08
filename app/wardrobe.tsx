import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { content } from '@/content/quotes';
import { useAppStore } from '@/data/store';
import { isUnlocked, type Item, ITEMS, type Slot, SLOTS, type Unlock, wear } from '@/engine/wardrobe';
import { markAwardsSeen, unlockFacts, unseenAwards } from '@/game/awards';
import { useOutfit } from '@/game/useOutfit';
import { Card, Enter, Gradient, Hero, Icon, Inky, PressScale, radius, Screen, space, Tag, Text, useTheme } from '@/ui';
import { OutfitBack, OutfitFace, OutfitHat, OutfitNeck } from '@/ui/fx/InkyOutfit';

/** Viewboxes that frame each slot's item on its own (Inky's 200 × 220 drawing space). */
const SLOT_VIEW: Record<Slot, string> = {
  hat: '40 -8 120 84',
  face: '24 88 152 70',
  neck: '40 160 120 52',
  bg: '-4 8 208 208',
};

/** Inky's wardrobe: every item is earned by playing, never bought. */
export default function WardrobeScreen() {
  const { t } = useTranslation();
  const { hue } = useTheme();
  const root = useAppStore((s) => s.root!);
  const update = useAppStore((s) => s.update);
  const outfit = useOutfit();
  const facts = useMemo(() => unlockFacts(root, content), [root]);
  const fresh = useMemo(() => new Set(unseenAwards(root, content).filter((k) => k.startsWith('item:'))), [root]);

  // Opening the wardrobe counts as seeing every new outfit.
  useEffect(() => {
    if (fresh.size) {
      const keys = [...fresh];
      const id = setTimeout(() => update((r) => markAwardsSeen(r, keys)), 1500);
      return () => clearTimeout(id);
    }
  }, [fresh, update]);

  const unlockText = (u: Unlock): string => {
    switch (u.kind) {
      case 'free':
        return t('wardrobe.free');
      case 'rank':
        return t('wardrobe.unlockRank', { rank: t(`rank.${u.rank}`) });
      case 'badge':
        return t('wardrobe.unlockBadge', { badge: t(`badges.${u.badge}`) });
      case 'set':
        return t('wardrobe.unlockSet', { set: t(`library.set_${u.set}`) });
    }
  };

  const choose = (slot: Slot, id: string | null) =>
    update((r) => ({ ...r, outfit: wear(outfit, slot, id, unlockFacts(r, content)) }));

  const hero = <Hero gradient="sky" back={{ label: t('common.back'), onPress: () => router.back() }} title={t('wardrobe.title')} />;

  return (
    <Screen hero={hero} testID="wardrobe">
      <Enter index={1}>
        <View style={styles.stage}>
          <View style={[StyleSheet.absoluteFill, styles.clip]}>
            <Gradient name="night" glows={[{ x: 50, y: 40, r: 60, color: '#FFC93C', opacity: 0.3 }]} />
          </View>
          <Inky pose="wave" size={190} outfit={outfit} label={t('wardrobe.title')} />
          <Text variant="caption" color="#E4DCFF" style={styles.center}>
            {t('wardrobe.intro')}
          </Text>
        </View>
      </Enter>

      {SLOTS.map((slot, si) => {
        const items = ITEMS.filter((i) => i.slot === slot);
        const h = hue(si + 1);
        return (
          <Enter key={slot} index={2 + si}>
            <Card style={styles.card}>
              <Text variant="title" accessibilityRole="header">
                {t(`wardrobe.slot_${slot}`)}
              </Text>
              <View style={styles.grid}>
                {slot !== 'face' ? (
                  <Tile
                    label={t('wardrobe.none')}
                    state={outfit[slot] === null ? t('wardrobe.wearing') : t('wardrobe.wear')}
                    selected={outfit[slot] === null}
                    onPress={() => choose(slot, null)}
                    tint={h.tint}
                    deep={h.deep}
                    testID={`wardrobe-${slot}-none`}
                  >
                    <Icon name="delete" size={26} color={h.deep} />
                  </Tile>
                ) : null}
                {items.map((item) => {
                  const open = isUnlocked(item, facts);
                  const on = outfit[slot] === item.id;
                  return (
                    <Tile
                      key={item.id}
                      label={t(`wardrobe.item_${item.id}`)}
                      state={on ? t('wardrobe.wearing') : open ? t('wardrobe.wear') : `${t('wardrobe.locked')}: ${unlockText(item.unlock)}`}
                      caption={open ? undefined : unlockText(item.unlock)}
                      selected={on}
                      disabled={!open}
                      isNew={fresh.has(`item:${item.id}`)}
                      onPress={() => choose(slot, item.id)}
                      tint={h.tint}
                      deep={h.deep}
                      testID={`wardrobe-${item.id}`}
                    >
                      <ItemArt item={item} locked={!open} />
                    </Tile>
                  );
                })}
              </View>
            </Card>
          </Enter>
        );
      })}
    </Screen>
  );
}

function ItemArt({ item, locked }: { item: Item; locked: boolean }) {
  return (
    <View style={{ opacity: locked ? 0.25 : 1 }}>
      <Svg width={64} height={item.slot === 'bg' ? 64 : 44} viewBox={SLOT_VIEW[item.slot]}>
        {item.slot === 'hat' ? <OutfitHat id={item.id} /> : null}
        {item.slot === 'face' ? item.id === 'monocle' ? <MonocleArt /> : <OutfitFace id={item.id} /> : null}
        {item.slot === 'neck' ? <OutfitNeck id={item.id} /> : null}
        {item.slot === 'bg' ? <OutfitBack id={item.id} /> : null}
      </Svg>
    </View>
  );
}

/** The wardrobe icon for Inky's own monocle (Inky draws the real one with a gradient). */
function MonocleArt() {
  return (
    <>
      <Circle cx="124" cy="122" r="25" fill="#CFE6FF" fillOpacity={0.3} stroke="#F5BE2E" strokeWidth={5} />
      <Path d="M148 128 Q162 152 152 178" fill="none" stroke="#F5BE2E" strokeWidth={2} strokeDasharray="2.5 3.5" strokeLinecap="round" />
    </>
  );
}

function Tile({
  label,
  state,
  caption,
  selected,
  disabled,
  isNew,
  onPress,
  tint,
  deep,
  testID,
  children,
}: {
  label: string;
  state: string;
  caption?: string;
  selected: boolean;
  disabled?: boolean;
  isNew?: boolean;
  onPress: () => void;
  tint: string;
  deep: string;
  testID?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${state}`}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.tile,
        { backgroundColor: selected ? tint : colors.surfaceRaised, borderColor: selected ? deep : colors.border },
      ]}
    >
      <View style={styles.art}>{children}</View>
      <Text variant="caption" style={styles.center} numberOfLines={2} color={disabled ? 'inkMuted' : 'ink'}>
        {label}
      </Text>
      {caption ? (
        <View style={styles.lockRow}>
          <Icon name="lock" size={11} color={colors.inkMuted} />
          <Text variant="caption" color="inkMuted" style={styles.small} numberOfLines={3}>
            {caption}
          </Text>
        </View>
      ) : null}
      {isNew ? (
        <View style={styles.newTag}>
          <Tag label={t('home.newBadge')} bg="#FF6B6B" fg="#FFFFFF" />
        </View>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  stage: { borderRadius: radius.xl, padding: space.lg, alignItems: 'center', gap: space.md },
  clip: { borderRadius: radius.xl, overflow: 'hidden' },
  center: { textAlign: 'center' },
  card: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 112,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: space.sm,
    alignItems: 'center',
    gap: 4,
  },
  art: { height: 64, alignItems: 'center', justifyContent: 'center' },
  lockRow: { flexDirection: 'row', gap: 3, alignItems: 'flex-start' },
  small: { flexShrink: 1, fontSize: 11, lineHeight: 14 },
  newTag: { position: 'absolute', top: -6, right: -6 },
});
