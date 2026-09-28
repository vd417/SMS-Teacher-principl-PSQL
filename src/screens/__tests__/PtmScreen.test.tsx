import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PtmScreen } from '../PtmScreen';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AppError } from '@/lib/errors';
import type { Repositories } from '@/data/repositories/types';
import type { PtmMeeting } from '@/data/domain';

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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

let mockRole = 'teacher';
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: {
      user: { role: mockRole, initials: 'AB', name: 'Alice Brown', photoUrl: null },
      tenant: { id: 'tenant-1' },
    },
  }),
  useTenantId: () => 'tenant-1',
}));

const meeting: PtmMeeting = {
  id: 'ptm-1',
  date: '2026-08-27',
  time: '10:30',
  teacher: 'Mrs. Rao',
  teacherId: 'teacher-1',
  subject: 'Math',
  studentId: 'student-1',
  studentName: 'Aarav Sharma',
  mode: 'In person',
  status: 'pending',
};

function makeRepos(overrides: Partial<Repositories['ptm']> = {}): Repositories {
  return {
    ptm: {
      list: jest.fn(async () => [meeting]),
      create: jest.fn(),
      remove: jest.fn(),
      ...overrides,
    },
  } as unknown as Repositories;
}

function renderScreen(repos: Repositories) {
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
          <PtmScreen />
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

afterEach(() => {
  mockRole = 'teacher';
});

test('hides the New meeting action for a principal', async () => {
  mockRole = 'principal';
  renderScreen(makeRepos());

  await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());

  expect(screen.queryByLabelText('New meeting')).toBeNull();
});

test('shows the New meeting action for a teacher', async () => {
  mockRole = 'teacher';
  renderScreen(makeRepos());

  await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());

  expect(screen.getByLabelText('New meeting')).toBeTruthy();
});

test('shows the server error message when cancelling a meeting fails', async () => {
  const remove = jest.fn(async () => {
    throw new AppError({ code: 'not_found', status: 404, message: 'Meeting not found' });
  });
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((b) => b.text === 'Yes, cancel')?.onPress?.();
  });
  renderScreen(makeRepos({ remove }));

  await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());

  fireEvent.press(screen.getByText('Cancel meeting'));

  await waitFor(() => expect(screen.getByText('Meeting not found')).toBeTruthy());
});
