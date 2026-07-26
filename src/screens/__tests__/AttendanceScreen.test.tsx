import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AttendanceScreen } from '../AttendanceScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, Student } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string }) => ReactLib.createElement(Text, null, `icon:${props.name}`),
  };
});
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { classId: 'c1' } }),
}));

const cls: Class = {
  id: 'c1',
  name: 'IV',
  section: 'A',
  subject: 'Math',
  studentCount: 0,
  room: '101',
};
const student: Student = {
  id: 's1',
  name: 'Asha',
  roll: '1',
  initials: 'AS',
  classId: 'c1',
  attendance: 0,
  grade: 'IV',
  parent: '',
  parentPhone: '',
  photoUrl: null,
};

function renderScreen(repos: Repositories) {
  // A fresh QueryClient per render — reusing the app's shared singleton across
  // tests in this file would serve one test's cached query results to the next.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repositories={repos}>
          <AuthProvider>
            <AttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockGoBack.mockClear();
});

test('navigates back ~1s after a successful save', async () => {
  jest.useFakeTimers();
  const repos = {
    classes: { get: jest.fn(async () => cls) },
    students: {
      listByClass: jest.fn(async () => ({ items: [student], nextCursor: null })),
    },
    attendance: {
      forClass: jest.fn(async () => []),
      save: jest.fn(async () => undefined),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Asha')).toBeTruthy());
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(repos.attendance.save).toHaveBeenCalled());
  expect(mockGoBack).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(mockGoBack).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});

test('stays on screen and does not navigate back when save fails', async () => {
  jest.useFakeTimers();
  const repos = {
    classes: { get: jest.fn(async () => cls) },
    students: {
      listByClass: jest.fn(async () => ({ items: [student], nextCursor: null })),
    },
    attendance: {
      forClass: jest.fn(async () => []),
      save: jest.fn(async () => {
        throw new Error('network error');
      }),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Asha')).toBeTruthy());
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(repos.attendance.save).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockGoBack).not.toHaveBeenCalled();

  jest.useRealTimers();
});
