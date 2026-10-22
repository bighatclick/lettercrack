// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'ios/*', 'android/*', 'tools/quotes/raw/*'],
  },
  {
    // The engine stays pure: no React, no React Native, no storage.
    files: ['src/engine/**/*.ts', 'src/ads/policy.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-native', 'react-native-*', 'expo-*', '@/data/*', '@/ui/*'] },
      ],
    },
  },
]);
