/**
 * Live end-to-end gate against a running sms-api (see docs/superpowers/specs/2026-09-26-sms-api-end-to-end-wiring-design.md §7).
 * NOT part of `npm test`. Plain Node environment: real fetch, real @microsoft/signalr — no API or SignalR mocks.
 * Sentry is mapped to its no-op mock because it is telemetry, not the system under test.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/**/*.e2e.test.ts'],
  setupFiles: ['<rootDir>/e2e/support/setup.ts'],
  globalSetup: '<rootDir>/e2e/support/globalSetup.ts',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  // babel-preset-expo inlines EXPO_PUBLIC_* process.env reads (see src/config/env.ts) as an
  // import of the ESM-only 'expo/virtual/env' module, so that one node_modules package must
  // still be transformed even though this config otherwise ignores node_modules (real fetch,
  // real @microsoft/signalr — no other node_modules transform is needed).
  transformIgnorePatterns: ['node_modules/(?!expo/virtual/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sentry/react-native$': '<rootDir>/jest/sentryMock.js',
  },
  testTimeout: 30000,
  maxWorkers: 1,
};
