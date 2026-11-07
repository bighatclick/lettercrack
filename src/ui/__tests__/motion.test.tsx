import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Enter, entranceFor } from '../fx/motion';
import { ThemeProvider } from '../theme';

describe('entrance animations and Reduce Motion', () => {
  it('uses an entrance animation when motion is allowed', () => {
    expect(entranceFor('up', 3, false)).toBeDefined();
    expect(entranceFor('pop', 0, false)).toBeDefined();
  });

  // With Reduce Motion on, Reanimated's own "skip" left delayed entrances at their start state,
  // so Home's Archive and Stats tiles never appeared. No entering animation at all is the fix.
  it('drops the entrance animation entirely under Reduce Motion', () => {
    expect(entranceFor('up', 3, true)).toBeUndefined();
    expect(entranceFor('pop', 6, true)).toBeUndefined();
  });

  it('still renders its children under Reduce Motion', async () => {
    const rm = jest.requireMock('react-native-reanimated') as { __setReducedMotion: (v: boolean) => void };
    rm.__setReducedMotion(true);
    try {
      await render(
        <ThemeProvider appearance="light" highContrast={false} textSizeStep={0}>
          <Enter index={3}>
            <Text>Archive</Text>
          </Enter>
        </ThemeProvider>,
      );
      expect(screen.getByText('Archive')).toBeTruthy();
    } finally {
      rm.__setReducedMotion(false);
    }
  });
});
