module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?(-.*)?|@expo(nent)?/.*|@expo-google-fonts/.*|@react-navigation/.*|@tanstack/.*|@microsoft/signalr|react-native-.*/(?!plugin)))',
  ],
  moduleNameMapper: {
    '^@sentry/react-native$': '<rootDir>/jest/sentryMock.js',
    '^@microsoft/signalr$': '<rootDir>/jest/signalrMock.js',
    '^@react-native-community/netinfo$': '<rootDir>/jest/netinfoMock.js',
    '^expo-notifications$': '<rootDir>/jest/notificationsMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
