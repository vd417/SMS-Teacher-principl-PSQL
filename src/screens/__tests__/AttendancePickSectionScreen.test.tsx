import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AttendancePickSectionScreen } from '../AttendancePickSectionScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, Student, AttendanceRecord } from '@/data/domain';

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
let mockGradeName = 'IV';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { gradeName: mockGradeName } }),
}));

function makeStudents(n: number, classId: string): Student[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${classId}-s${i}`,
    name: `Student ${i}`,
    roll: `${i + 1}`,
    initials: 'ST',
    classId,
    attendance: 0,
    grade: 'IV',
    parent: '',
    parentPhone: '',
    photoUrl: null,
  }));
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
          <AuthProvider>
            <AttendancePickSectionScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockGradeName = 'IV';
});

test("shows only the requested grade's sections with real (non-zero) student counts, and navigates to AttendanceScreen on tap", async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
    { id: 'c3', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  // Only IV's sections (A, B) render — V's section is excluded.
  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
  expect(screen.getByText('3 students')).toBeTruthy();
  expect(screen.getByText('Section A')).toBeTruthy();
  expect(screen.getByText('Section B')).toBeTruthy();

  fireEvent.press(screen.getByText('Section A'));
  expect(mockNavigate).toHaveBeenCalledWith('AttendanceScreen', { classId: 'c1' });
});

test('does not show "0 students" while summaries are still loading', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  ];

  let resolveRoster!: (v: { items: Student[]; nextCursor: null }) => void;
  const rosterPromise = new Promise<{ items: Student[]; nextCursor: null }>((resolve) => {
    resolveRoster = resolve;
  });

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: { listByClass: jest.fn(() => rosterPromise) },
    attendance: { forClass: jest.fn(async () => [] as AttendanceRecord[]) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Section A')).toBeTruthy());
  expect(screen.queryByText('0 students')).toBeNull();

  resolveRoster({ items: makeStudents(2, 'c1'), nextCursor: null });

  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
});

test('shows an empty state when the grade has no matching sections', async () => {
  mockGradeName = 'Nonexistent Grade';
  const repos = {
    classes: { list: jest.fn(async () => [] as Class[]) },
    students: { listByClass: jest.fn(async () => ({ items: [], nextCursor: null })) },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('No sections found')).toBeTruthy());
});
