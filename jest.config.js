module.exports = {
  // Os specs de service/controller integram com Postgres real; cadeias de
  // queries + cleanup por teste estouram os 5s default do Jest.
  testTimeout: 30000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  setupFiles: ['<rootDir>/src/tests/jest.setup.ts'],
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Cobertura ligada por --coverage; medida so na logica de negocio, por camada
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    'src/repositories/**/*.ts',
    'src/helpers/**/*.ts',
    'src/middlewares/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};
