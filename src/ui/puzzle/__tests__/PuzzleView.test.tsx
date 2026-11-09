import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useMemo, useReducer, useRef } from 'react';
import { I18nextProvider } from 'react-i18next';

import { levelSeed } from '@/engine/cipher';
import { createPuzzle, puzzleReducer, usedLetters } from '@/engine/puzzle';
import { cellFlags } from '@/game/flags';
import { i18n, initI18n } from '@/i18n';
import { ThemeProvider } from '@/ui/theme';

import { PuzzleView } from '../PuzzleView';

initI18n();
// The first render pulls in React Native and the font metrics cold; give CI room.
jest.setTimeout(20_000);

const TEXT = 'Well done is better than well said.';
const PLAIN = TEXT.toUpperCase();

function Harness({ autoFill = true, highlightConflicts = true }) {
  const [state, dispatch] = useReducer(
    puzzleReducer,
    null,
    () => createPuzzle({ text: TEXT, seed: levelSeed(1), difficulty: 'expert', autoFill }),
  );
  const keyId = useRef(0);
  const flags = useMemo(() => cellFlags(state, highlightConflicts), [state, highlightConflicts]);
  return (
    <PuzzleView
      state={state}
      flags={flags}
      used={usedLetters(state)}
      hintsLeft={2}
      message={null}
      onSelect={(index) => dispatch({ type: 'select', index })}
      onLetter={(letter) => dispatch({ type: 'input', letter, keyId: ++keyId.current })}
      onDelete={() => dispatch({ type: 'erase', keyId: ++keyId.current })}
      onReveal={() => dispatch({ type: 'reveal' })}
      onCheck={() => dispatch({ type: 'check' })}
    />
  );
}

async function setup(props: { autoFill?: boolean; highlightConflicts?: boolean } = {}) {
  await render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider appearance="light" highContrast={false} textSizeStep={3}>
        <Harness {...props} />
      </ThemeProvider>
    </I18nextProvider>,
  );
  // The board lays out after it knows its width.
  await act(async () => {
    fireEvent(screen.getByTestId('board'), 'layout', { nativeEvent: { layout: { width: 360, height: 400, x: 0, y: 0 } } });
  });
}

const cell = (i: number) => screen.getByTestId(`cell-${i}`);
const label = (i: number) => cell(i).props.accessibilityLabel as string;
const indicesOf = (letter: string) => PLAIN.split('').flatMap((c, i) => (c === letter ? [i] : []));
const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

describe('PuzzleView (component)', () => {
  it('renders every letter of the quote as an accessible cell at the largest text size', async () => {
    await setup();
    const letters = PLAIN.split('').filter((c) => /[A-Z]/.test(c)).length;
    expect(screen.getAllByRole('button').filter((b) => /^cell-/.test(b.props.testID ?? ''))).toHaveLength(letters);
    expect(label(0)).toMatch(/^cipher [A-Z], empty$/);
  });

  it('tapping a cell selects it', async () => {
    await setup();
    await press('cell-5');
    expect(cell(5).props.accessibilityState).toMatchObject({ selected: true });
    expect(cell(0).props.accessibilityState).toMatchObject({ selected: false });
  });

  it('auto-fill: typing fills every cell with the same cipher letter', async () => {
    await setup();
    await press(`cell-${indicesOf('L')[0]}`);
    await press('key-L');
    for (const i of indicesOf('L')) expect(label(i)).toMatch(/guess L$/);
    expect(label(indicesOf('E')[0]!)).toMatch(/empty$/);
  });

  it('auto-fill off: typing fills only the selected cell', async () => {
    await setup({ autoFill: false });
    const [first, ...rest] = indicesOf('L');
    await press(`cell-${first}`);
    await press('key-L');
    expect(label(first!)).toMatch(/guess L$/);
    for (const i of rest) expect(label(i)).toMatch(/empty$/);
  });

  it('flags a conflict with a dotted underline, not colour alone', async () => {
    await setup();
    const w = indicesOf('W')[0]!;
    const d = indicesOf('D')[0]!;
    await press(`cell-${w}`);
    await press('key-X');
    await press(`cell-${d}`);
    await press('key-X');
    expect(label(w)).toMatch(/conflict$/);
    expect(label(d)).toMatch(/conflict$/);
    expect(screen.getByTestId(`cell-${w}-flag`)).toBeTruthy();
  });

  it('does not flag conflicts when the setting is off', async () => {
    await setup({ highlightConflicts: false });
    await press(`cell-${indicesOf('W')[0]}`);
    await press('key-X');
    await press(`cell-${indicesOf('D')[0]}`);
    await press('key-X');
    expect(screen.queryByTestId(`cell-${indicesOf('W')[0]}-flag`)).toBeNull();
  });

  it('Check marks wrong letters, and the keyboard dims used letters without disabling them', async () => {
    await setup();
    await press(`cell-${indicesOf('W')[0]}`);
    await press('key-Q');
    await press('hint-check');
    expect(label(indicesOf('W')[0]!)).toMatch(/marked wrong$/);
    const q = screen.getByTestId('key-Q');
    expect(q.props.accessibilityHint).toBe('already used');
    expect(q.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('keeps Check disabled until a letter is typed (D13)', async () => {
    await setup();
    expect(screen.getByTestId('hint-check').props.accessibilityState?.disabled).toBe(true);
    await press(`cell-${indicesOf('W')[0]}`);
    await press('key-Q');
    expect(screen.getByTestId('hint-check').props.accessibilityState?.disabled).toBe(false);
  });

  it('delete clears the letter', async () => {
    await setup();
    const l = indicesOf('L')[0]!;
    await press(`cell-${l}`);
    await press('key-L');
    await press(`cell-${l}`);
    await press('key-delete');
    expect(label(l)).toMatch(/empty$/);
  });
});
