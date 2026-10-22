/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/tools/quotes/raw/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
