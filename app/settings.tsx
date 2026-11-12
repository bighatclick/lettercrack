import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, View } from 'react-native';

import { content } from '@/content/quotes';
import { PRIVACY_URL, TERMS_URL } from '@/config/links';
import { useAppStore } from '@/data/store';
import type { Appearance, Difficulty } from '@/data/schema';
import { feedbackMailto } from '@/game/report';
import { pushOnce } from '@/game/nav';
import { syncReminders } from '@/lib/reminderSync';
import { restorePurchasesAvailable } from '@/iap/availability';
import { hasReminderPermission, requestReminderPermission } from '@/lib/notifications';
import { Card, Chip, Enter, Hero, Inky, radius, Screen, space, Text, useTheme } from '@/ui';
import { ChoiceRow, LinkRow, ToggleRow } from '@/ui/primitives/SettingRow';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const APPEARANCES: { value: Appearance; key: string }[] = [
  { value: 'system', key: 'settings.appearanceSystem' },
  { value: 'light', key: 'settings.appearanceLight' },
  { value: 'dark', key: 'settings.appearanceDark' },
];



function Section({ label, hueIndex }: { label: string; hueIndex: number }) {
  const { hue } = useTheme();
  const h = hue(hueIndex);
  return (
    <View style={{ flexDirection: 'row', marginBottom: space.xs }}>
      <View style={{ backgroundColor: h.tint, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill }}>
        <Text variant="overline" color={h.deep} accessibilityRole="header" style={{ letterSpacing: 1.2 }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/** Settings (S7). Restore Purchases appears only when payments are switched on. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.root!.settings);
  const set = useAppStore((s) => s.setSetting);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  // D42: a restored save (or notifications turned off in system settings) can have the reminder
  // switched on with nothing scheduled. The toggle shows what will really happen; the saved
  // choice is kept, so granting permission later brings the reminder back.
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const checkPermission = useCallback(() => {
    void hasReminderPermission().then(setPermitted);
  }, []);
  useEffect(() => {
    checkPermission();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);
  const reminderOn = settings.dailyReminder && permitted !== false;

  const toggleReminder = async (on: boolean) => {
    if (on && !(await requestReminderPermission())) {
      setPermitted(false);
      set('dailyReminder', false);
      return;
    }
    if (on) setPermitted(true);
    set('dailyReminder', on);
    syncReminders(t);
  };

  const hero = (
    <Hero
      gradient="candy"
      back={{ label: t('common.back'), onPress: () => router.back() }}
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      side={<Inky pose="idle" size={96} />}
    />
  );

  return (
    <Screen hero={hero}>

      <Enter index={1}>
      <Card>
        <Section label={t('settings.play')} hueIndex={4} />
        <ToggleRow label={t('settings.autoFill')} hint={t('settings.autoFillHint')} value={settings.autoFill} onChange={(v) => set('autoFill', v)} testID="setting-autofill" />
        <ToggleRow label={t('settings.conflicts')} hint={t('settings.conflictsHint')} value={settings.highlightConflicts} onChange={(v) => set('highlightConflicts', v)} />
        <ToggleRow label={t('settings.timer')} hint={t('settings.timerHint')} value={settings.showTimer} onChange={(v) => set('showTimer', v)} />
        <ChoiceRow label={t('settings.difficulty')}>
          {DIFFICULTIES.map((d) => (
            <Chip key={d} label={t(`difficulty.${d}`)} selected={settings.defaultDifficulty === d} onPress={() => set('defaultDifficulty', d)} />
          ))}
        </ChoiceRow>
        <ToggleRow label={t('settings.reminder')} hint={t('settings.reminderHint')} value={reminderOn} onChange={toggleReminder} testID="setting-reminder" />
      </Card>
      </Enter>

      <Enter index={2}>
      <Card>
        <Section label={t('settings.look')} hueIndex={2} />
        <ChoiceRow label={t('settings.textSize')}>
          {([0, 1, 2, 3] as const).map((n) => (
            <Chip key={n} label={t('settings.textSizeStep', { n: n + 1 })} selected={settings.textSize === n} onPress={() => set('textSize', n)} testID={`setting-textsize-${n}`} />
          ))}
        </ChoiceRow>
        <ChoiceRow label={t('settings.appearance')}>
          {APPEARANCES.map((a) => (
            <Chip key={a.value} label={t(a.key)} selected={settings.appearance === a.value} onPress={() => set('appearance', a.value)} />
          ))}
        </ChoiceRow>
        <ToggleRow label={t('settings.highContrast')} value={settings.highContrast} onChange={(v) => set('highContrast', v)} />
        <ToggleRow label={t('settings.sound')} value={settings.sound} onChange={(v) => set('sound', v)} />
        <ToggleRow label={t('settings.haptics')} value={settings.haptics} onChange={(v) => set('haptics', v)} />
      </Card>
      </Enter>

      <Enter index={3}>
      <Card>
        <Section label={t('settings.about')} hueIndex={0} />
        <LinkRow label={t('settings.aboutQuotes')} onPress={() => pushOnce('/about')} testID="settings-about" />
        <LinkRow
          label={t('settings.feedback')}
          onPress={() => Linking.openURL(feedbackMailto(useAppStore.getState().root!, content, t('settings.feedbackSubject'), version)).catch(() => {})}
        />
        <LinkRow label={t('settings.privacy')} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />
        <LinkRow label={t('settings.terms')} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} />
        {restorePurchasesAvailable() ? <LinkRow label={t('settings.restore')} onPress={() => {}} /> : null}
        <Text variant="caption" color="inkMuted">
          {t('settings.version', { version })}
        </Text>
      </Card>
      </Enter>
    </Screen>
  );
}
