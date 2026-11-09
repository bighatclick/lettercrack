import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n, initI18n } from '@/i18n';
import { ThemeProvider } from '@/ui/theme';

import { DifficultySheet } from '../DifficultySheet';

initI18n();
jest.setTimeout(20_000);

const restarts: string[] = [];

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <DifficultySheet visible={open} current="easy" onClose={() => setOpen(false)} onRestart={(d) => restarts.push(d)} />
      {open ? null : <Reopen onPress={() => setOpen(true)} />}
    </>
  );
}

function Reopen({ onPress }: { onPress: () => void }) {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return (
    <Pressable testID="reopen" onPress={onPress}>
      <Text>reopen</Text>
    </Pressable>
  );
}

const press = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

describe('DifficultySheet (D14)', () => {
  it('forgets a cancelled pick: reopening starts from the current difficulty', async () => {
    await render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider appearance="light" highContrast={false} textSizeStep={0}>
          <Harness />
        </ThemeProvider>
      </I18nextProvider>,
    );
    const restart = () => screen.getByLabelText(i18n.t('puzzle.restart'));
    expect(restart().props.accessibilityState?.disabled).toBe(true);
    await press(screen.getByLabelText(i18n.t('difficulty.medium')));
    expect(restart().props.accessibilityState?.disabled).toBe(false);
    // Cancel, then open again.
    await press(screen.getAllByLabelText(i18n.t('puzzle.cancel')).at(-1)!);
    await press(screen.getByTestId('reopen'));
    expect(restart().props.accessibilityState?.disabled).toBe(true);
    expect(restarts).toEqual([]);
  });
});
