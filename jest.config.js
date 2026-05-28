module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/src/node_modules/ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  setupFiles: ['<rootDir>/src/tests/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/src/node_modules'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.ts', '!**/*.test.ts', '!**/node_modules/**'],
};
