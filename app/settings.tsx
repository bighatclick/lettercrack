import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { content } from '@/content/quotes';
import { PRIVACY_URL, TERMS_URL } from '@/config/links';
import { useAppStore } from '@/data/store';
import type { Appearance, Difficulty } from '@/data/schema';
import { feedbackMailto } from '@/game/report';
import { syncReminders } from '@/lib/reminderSync';
import { restorePurchasesAvailable } from '@/iap/availability';
import { requestReminderPermission } from '@/lib/notifications';
import { Button, Card, Chip, Screen, Text } from '@/ui';
import { ChoiceRow, LinkRow, ToggleRow } from '@/ui/primitives/SettingRow';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const APPEARANCES: { value: Appearance; key: string }[] = [
  { value: 'system', key: 'settings.appearanceSystem' },
  { value: 'light', key: 'settings.appearanceLight' },
  { value: 'dark', key: 'settings.appearanceDark' },
];



/** Settings (S7). Restore Purchases appears only when payments are switched on. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.root!.settings);
  const set = useAppStore((s) => s.setSetting);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const toggleReminder = async (on: boolean) => {
    if (on && !(await requestReminderPermission())) {
      set('dailyReminder', false);
      return;
    }
    set('dailyReminder', on);
    syncReminders(t);
  };

  return (
    <Screen>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Text variant="display" accessibilityRole="header">
        {t('settings.title')}
      </Text>

      <Card>
        <Text variant="caption" color="inkMuted" accessibilityRole="header">
          {t('settings.play')}
        </Text>
        <ToggleRow label={t('settings.autoFill')} hint={t('settings.autoFillHint')} value={settings.autoFill} onChange={(v) => set('autoFill', v)} testID="setting-autofill" />
        <ToggleRow label={t('settings.conflicts')} hint={t('settings.conflictsHint')} value={settings.highlightConflicts} onChange={(v) => set('highlightConflicts', v)} />
        <ToggleRow label={t('settings.timer')} hint={t('settings.timerHint')} value={settings.showTimer} onChange={(v) => set('showTimer', v)} />
        <ChoiceRow label={t('settings.difficulty')}>
          {DIFFICULTIES.map((d) => (
            <Chip key={d} label={t(`difficulty.${d}`)} selected={settings.defaultDifficulty === d} onPress={() => set('defaultDifficulty', d)} />
          ))}
        </ChoiceRow>
        <ToggleRow label={t('settings.reminder')} hint={t('settings.reminderHint')} value={settings.dailyReminder} onChange={toggleReminder} />
      </Card>

      <Card>
        <Text variant="caption" color="inkMuted" accessibilityRole="header">
          {t('settings.look')}
        </Text>
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

      <Card>
        <Text variant="caption" color="inkMuted" accessibilityRole="header">
          {t('settings.about')}
        </Text>
        <LinkRow label={t('settings.aboutQuotes')} onPress={() => router.push('/about')} testID="settings-about" />
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
    </Screen>
  );
}
