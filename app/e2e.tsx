import { Redirect } from 'expo-router';

/**
 * Test-only route for Maestro (`lettercrack://e2e?…`): the test clock and save set-up, see
 * `src/e2e/E2EScreen.tsx`. Only E2E builds (EXPO_PUBLIC_E2E=1) have it. In every other build the
 * check below is inlined to false, the require is dropped, and the link just opens Home.
 */
export default function E2ERoute() {
  if (process.env.EXPO_PUBLIC_E2E !== '1') return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { E2EScreen } = require('@/e2e/E2EScreen') as typeof import('@/e2e/E2EScreen');
  return <E2EScreen />;
}
