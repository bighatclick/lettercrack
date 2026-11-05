/** True only in builds made for Maestro (EXPO_PUBLIC_E2E=1). Inlined at build time, so release builds drop the hooks. */
export const E2E = process.env.EXPO_PUBLIC_E2E === '1';
