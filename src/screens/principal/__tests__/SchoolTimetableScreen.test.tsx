import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SchoolTimetableScreen } from '../SchoolTimetableScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class } from '@/data/domain';

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
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { flow: 'timetable' } }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

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
          <AuthProvider>
            <SchoolTimetableScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test('groups two classes that share a grade into one grade card', async () => {
  const classList: Class[] = [
    {
      id: 'c1',
      name: 'I-A',
      grade: 'I',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
    {
      id: 'c2',
      name: 'I-B',
      grade: 'I',
      section: 'B',
      subject: 'Math',
      studentCount: 0,
      room: '102',
    },
  ];

  const repos = {
    classes: { list: jest.fn(async () => classList) },
    students: { listByClass: jest.fn(async () => ({ items: [], nextCursor: null })) },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Timetable')).toBeTruthy());
  expect(screen.getByText('2 sections')).toBeTruthy();
  expect(screen.queryByText('I-A')).toBeNull();
  expect(screen.queryByText('I-B')).toBeNull();
});

test('keeps a class with no grade set keyed by its own name', async () => {
  const classList: Class[] = [
    {
      id: 'c1',
      name: 'C1',
      grade: '',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
  ];

  const repos = {
    classes: { list: jest.fn(async () => classList) },
    students: { listByClass: jest.fn(async () => ({ items: [], nextCursor: null })) },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('C1')).toBeTruthy());
  expect(screen.getByText('1 section')).toBeTruthy();
});

test('navigates to the section picker with timetable flow on grade tap', async () => {
  const classList: Class[] = [
    {
      id: 'c1',
      name: 'IV',
      grade: '',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
  ];

  const repos = {
    classes: { list: jest.fn(async () => classList) },
    students: { listByClass: jest.fn(async () => ({ items: [], nextCursor: null })) },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('IV')).toBeTruthy());
  fireEvent.press(screen.getByText('IV'));
  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', {
    gradeName: 'IV',
    flow: 'timetable',
  });
});
