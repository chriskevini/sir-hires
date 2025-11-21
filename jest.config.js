export default {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'chrome-extension/**/*.js',
    '!chrome-extension/**/*.test.js',
    '!chrome-extension/**/*.spec.js',
    '!chrome-extension/icons/**',
    '!chrome-extension/test-*.js',
    '!chrome-extension/debug-*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {},
  moduleFileExtensions: ['js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
};
