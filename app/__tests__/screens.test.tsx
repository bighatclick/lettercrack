import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { content } from '@/content/quotes';
import { createMemoryKV } from '@/data/kv';
import { useAppStore } from '@/data/store';
import { addDays, dailyQuoteId, LAUNCH_DATE } from '@/engine/daily';
import { i18n, initI18n } from '@/i18n';
import { ThemeProvider } from '@/ui/theme';

import Archive from '../archive';
import Home from '../index';
import Onboarding from '../onboarding';
import Settings from '../settings';
import Solved from '../solved';
import Stats from '../stats';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: () => true },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(async () => false), requestReview: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => false), shareAsync: jest.fn() }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('@/ads/interstitial', () => ({ maybeShowInterstitial: jest.fn(async () => false) }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('@/game/today', () => ({ today: () => '2027-02-03' }));

initI18n();
jest.setTimeout(20_000);

/** Presses must be awaited inside act, or later renders in the file come back empty. */
async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

function wrap(node: ReactNode) {
  const root = useAppStore.getState().root!;
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <ThemeProvider appearance={root.settings.appearance} highContrast={root.settings.highContrast} textSizeStep={3}>
          {node}
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

beforeEach(() => {
  mockParams = {};
  mockPush.mockClear();
  mockReplace.mockClear();
  useAppStore.setState({ ready: false, root: null });
  useAppStore.getState().hydrate(createMemoryKV(), () => 1_800_000_000_000);
});

describe('Home', () => {
  it('sends a new player to onboarding', async () => {
    await render(wrap(<Home />));
    expect(screen.getByTestId('redirect').props.children).toBe('/onboarding');
  });

  it('links to archive, stats and settings once onboarded', async () => {
    useAppStore.getState().update((r) => ({ ...r, meta: { ...r.meta, onboardedAt: 1 } }));
    await render(wrap(<Home />));
    await press('home-archive');
    await press('home-stats');
    await press('home-settings');
    expect(mockPush.mock.calls.map((c) => c[0])).toEqual(['/archive', '/stats', '/settings']);
  });

  it("shows today's three goals with progress", async () => {
    useAppStore.getState().update((r) => ({ ...r, meta: { ...r.meta, onboardedAt: 1 } }));
    await render(wrap(<Home />));
    expect(screen.getByTestId('home-goals')).toBeTruthy();
    expect(screen.getByText(i18n.t('goals.daily'))).toBeTruthy();
    expect(screen.getByText(i18n.t('home.goalsReward'))).toBeTruthy();
  });
});

describe('Solved', () => {
  const TODAY = '2027-02-03';
  it("celebrates a streak milestone, shows goal progress and teases tomorrow's quote", async () => {
    const id = dailyQuoteId(TODAY, content.dailyOrder);
    useAppStore.getState().update((r) => ({
      ...r,
      meta: { ...r.meta, onboardedAt: 1, reminderOffered: true },
      progress: { ...r.progress, solved: { [id]: { date: TODAY, clean: true, timeMs: null, difficulty: 'medium' } } },
      daily: { ...r.daily, streak: 7, best: 7, solvedDates: [TODAY], bonusFreezes: 1, milestonesAwarded: [7] },
      goals: { date: TODAY, progress: { daily: 1 }, rewarded: false },
    }));
    mockParams = { key: `daily:${TODAY}`, clean: '1', streak: '7', milestone: '7', freezeEarned: '1', goalsDone: 'daily', goalsReward: '0' };
    await render(wrap(<Solved />));
    expect(screen.getByTestId('solved-milestone')).toBeTruthy();
    expect(screen.getByText(i18n.t('solved.milestoneFreeze'))).toBeTruthy();
    expect(screen.getByTestId('solved-goals')).toBeTruthy();
    expect(screen.getByText(i18n.t('goals.justDone'))).toBeTruthy();
    expect(screen.getByTestId('solved-teaser')).toBeTruthy();
    expect(screen.getByTestId('solved-share-result')).toBeTruthy();
  });

  it('shows no teaser or result line for an archive daily', async () => {
    const past = '2027-01-20';
    mockParams = { key: `daily:${past}`, clean: '0', from: 'archive' };
    await render(wrap(<Solved />));
    expect(screen.queryByTestId('solved-teaser')).toBeNull();
    expect(screen.queryByTestId('solved-share-result')).toBeNull();
    expect(screen.queryByTestId('solved-milestone')).toBeNull();
  });
});

describe('Onboarding', () => {
  it('solves "A CAT", then picks a difficulty and finishes', async () => {
    await render(wrap(<Onboarding />));
    await act(async () => {
      fireEvent(screen.getByTestId('board'), 'layout', { nativeEvent: { layout: { width: 360, height: 400, x: 0, y: 0 } } });
    });
    // Tap each letter cell and type the answer.
    const answer: Record<number, string> = { 0: 'A', 2: 'C', 4: 'T' };
    for (const [i, letter] of Object.entries(answer)) {
      await press(`cell-${i}`);
      await press(`key-${letter}`);
    }
    await press('onboarding-next');
    await press('onboarding-hard');
    await press('onboarding-start');
    const root = useAppStore.getState().root!;
    expect(root.meta.onboardedAt).not.toBeNull();
    expect(root.settings.defaultDifficulty).toBe('hard');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('Settings', () => {
  it('changes settings and stamps the settings time for sync', async () => {
    await render(wrap(<Settings />));
    await press('setting-autofill');
    await press('setting-textsize-2');
    const root = useAppStore.getState().root!;
    expect(root.settings.autoFill).toBe(false);
    expect(root.settings.textSize).toBe(2);
    expect(root.meta.settingsUpdatedAt).toBeGreaterThan(0);
  });

  it('hides Restore Purchases while payments are off', async () => {
    await render(wrap(<Settings />));
    expect(screen.queryByText(i18n.t('settings.restore'))).toBeNull();
    expect(screen.getByText(i18n.t('settings.aboutQuotes'))).toBeTruthy();
  });
});

describe('Archive', () => {
  it('shows past dailies with their status and opens them', async () => {
    const solvedDay = '2027-01-02';
    useAppStore.getState().update((r) => ({ ...r, daily: { ...r.daily, solvedDates: [solvedDay] } }));
    await render(wrap(<Archive />));
    expect(screen.getByTestId(`archive-${LAUNCH_DATE}`)).toBeTruthy();
    expect(screen.queryByTestId('archive-2027-02-03')).toBeNull(); // today lives on Home
    expect(screen.getByTestId(`archive-${solvedDay}`).props.accessibilityLabel).toContain(i18n.t('archive.solved'));
    await press(`archive-${addDays(solvedDay, 1)}`);
    expect(mockPush).toHaveBeenCalledWith(`/puzzle/${encodeURIComponent('daily:2027-01-03')}`);
  });
});

describe('Stats', () => {
  it('shows counts and favourite authors', async () => {
    const id = dailyQuoteId('2027-01-02', content.dailyOrder);
    useAppStore.getState().update((r) => ({
      ...r,
      progress: { ...r.progress, solved: { [id]: { date: '2027-01-02', clean: true, timeMs: null, difficulty: 'easy' } } },
    }));
    await render(wrap(<Stats />));
    expect(screen.getByText(content.quote(id)!.author)).toBeTruthy();
    expect(screen.queryByText(i18n.t('stats.average'))).toBeNull();
    expect(screen.queryByTestId('stats-freezes')).toBeNull();
  });

  it('shows saved streak freezes', async () => {
    useAppStore.getState().update((r) => ({ ...r, daily: { ...r.daily, bonusFreezes: 2 } }));
    await render(wrap(<Stats />));
    expect(screen.getByTestId('stats-freezes')).toBeTruthy();
  });
});
