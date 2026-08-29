import { staffCheckInError, GEO_CHECKIN_LOCKED_MESSAGE } from '../hooks';
import { isAppError } from '@/lib/errors';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

test('staffCheckInError carries feature_locked code', () => {
  const err = staffCheckInError();
  expect(err.code).toBe('feature_locked');
  expect(err.status).toBe(403);
  expect(err.message).toBe(GEO_CHECKIN_LOCKED_MESSAGE);
});

test('staffCheckInError is an AppError', () => {
  expect(isAppError(staffCheckInError())).toBe(true);
});
