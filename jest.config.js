module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?(-.*)?|@expo(nent)?/.*|@expo-google-fonts/.*|@react-navigation/.*|@tanstack/.*|react-native-.*/(?!plugin)))',
  ],
  moduleNameMapper: {
    '^@sentry/react-native$': '<rootDir>/jest/sentryMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
