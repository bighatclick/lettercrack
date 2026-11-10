import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { loopsOff, useNoLoops } from '../fx/loops';
import { ThemeProvider } from '../theme';

// Endless loops keep Android from going idle, so uiautomator and Maestro can't read the screen.
// E2E builds keep them still; normal builds keep them unless Reduce Motion is on.
describe('endless animation loops', () => {
  it('run only in a normal build with motion allowed', () => {
    expect(loopsOff(false, false)).toBe(false);
    expect(loopsOff(true, false)).toBe(true);
    expect(loopsOff(false, true)).toBe(true);
    expect(loopsOff(true, true)).toBe(true);
  });

  it('run in this (non-E2E) test build', async () => {
    const Probe = () => <Text>{useNoLoops() ? 'still' : 'looping'}</Text>;
    await render(
      <ThemeProvider appearance="light" highContrast={false} textSizeStep={0}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('looping')).toBeTruthy();
  });
});
