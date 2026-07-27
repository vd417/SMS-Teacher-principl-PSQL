import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AttendancePickClassScreen } from '../AttendancePickClassScreen';
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

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
            <AttendancePickClassScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test("shows a Present/Total/% summary aggregated across a grade's sections, and navigates to the section page on tap", async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };
  // c1 already marked (both present); c2 not marked yet today.
  const attendance: Record<string, AttendanceRecord[]> = {
    c1: [
      { studentId: 'c1-s0', status: 'P', date: '2026-07-26' },
      { studentId: 'c1-s1', status: 'P', date: '2026-07-26' },
    ],
    c2: [],
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: {
      forClass: jest.fn(async (classId: string) => attendance[classId] ?? []),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  // Total = 2 + 3 = 5, Present = 2 + 0 = 2, pct = round(2/5*100) = 40.
  await waitFor(() => expect(screen.getByText('Present 2/5 · 40%')).toBeTruthy());

  fireEvent.press(screen.getByText('IV'));

  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', { gradeName: 'IV' });
});

test('excludes a section from the aggregate (not counted as unmarked) when its attendance fetch fails', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(4, 'c1'),
    c2: makeStudents(3, 'c2'),
  };
  // c1's roster succeeds but its attendance fetch fails; c2 is marked with 2 present.
  const attendance: Record<string, AttendanceRecord[]> = {
    c2: [
      { studentId: 'c2-s0', status: 'P', date: '2026-07-26' },
      { studentId: 'c2-s1', status: 'P', date: '2026-07-26' },
      { studentId: 'c2-s2', status: 'A', date: '2026-07-26' },
    ],
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: {
      forClass: jest.fn(async (classId: string) => {
        if (classId === 'c1') throw new Error('network error');
        return attendance[classId] ?? [];
      }),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  // c1 is fully excluded (0/0), so the aggregate is just c2's 2/3, not (2)/(4+3).
  await waitFor(() => expect(screen.getByText('Present 2/3 · 67%')).toBeTruthy());
});

test('shows "No students" when a grade has no students in any section', async () => {
  const classes: Class[] = [
    { id: 'c3', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async () => ({ items: [], nextCursor: null })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('No students')).toBeTruthy());
});
