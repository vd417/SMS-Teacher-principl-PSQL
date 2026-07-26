import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrincipalAttendanceScreen } from '../PrincipalAttendanceScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, SchoolAttendance } from '@/data/domain';

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

const classList: Class[] = [
  { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  { id: 'c2', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '102' },
];

const attendanceData: SchoolAttendance = {
  date: '2026-07-26',
  presentTotal: 28,
  studentTotal: 30,
  overallPct: 93,
  classes: [
    { classId: 'c1', className: 'IV-A', present: 28, total: 30, pct: 93 },
    { classId: 'c2', className: 'V-A', present: 0, total: 0, pct: 0 },
  ],
  staff: [],
};

function renderScreen(repos: Repositories) {
  // A fresh QueryClient per render — reusing the app's shared singleton across
  // tests would serve one test's cached query results to the next.
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
            <PrincipalAttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test('shows "Present X/Y" phrasing for a grade with students, and "No students" for a grade with none', async () => {
  const repos = {
    principal: { attendance: jest.fn(async () => attendanceData) },
    classes: { list: jest.fn(async () => classList) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Present 28/30')).toBeTruthy());
  expect(screen.getAllByText('93%').length).toBeGreaterThan(0);

  expect(screen.getByText('No students')).toBeTruthy();
  expect(screen.queryByText('Present 0/0')).toBeNull();
  expect(screen.queryByText('0%')).toBeNull();
});
