/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/tools/quotes/raw/', '/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^@modules/(.*)$': '<rootDir>/modules/$1' },
};
