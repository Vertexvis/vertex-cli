module.exports = {
  collectCoverageFrom: ['**/src/**', '!**/src/__*__/**'],
  coveragePathIgnorePatterns: ['/lib/', '/node_modules/'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  globals: { 'ts-jest': { tsconfig: './tsconfig.json' } },
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
};
