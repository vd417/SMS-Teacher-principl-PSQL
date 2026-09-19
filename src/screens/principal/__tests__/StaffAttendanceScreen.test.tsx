import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StaffAttendanceScreen } from '../StaffAttendanceScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { SchoolAttendance } from '@/data/domain';

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

const attendanceData: SchoolAttendance = {
  date: '2026-07-26',
  presentTotal: 37,
  studentTotal: 40,
  overallPct: 93,
  classes: [],
  staff: [],
};

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
            <StaffAttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test('filters staff by name, subject, or role and shows inline results', async () => {
  const staffAttendance: SchoolAttendance = {
    ...attendanceData,
    staff: [
      {
        teacherId: 't1',
        name: 'Alice Smith',
        initials: 'AS',
        subject: 'Mathematics',
        phone: '',
        checkedIn: true,
        designation: 'Teacher',
      },
      {
        teacherId: 't2',
        name: 'Bob Guard',
        initials: 'BG',
        subject: '',
        phone: '',
        checkedIn: false,
        role: 'Security',
      },
    ],
  };
  const repos = {
    principal: { attendance: jest.fn(async () => staffAttendance) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Teaching staff')).toBeTruthy());

  fireEvent.changeText(
    screen.getByPlaceholderText('Search staff by name, subject, or role...'),
    'alice'
  );
  expect(screen.getByText('Alice Smith')).toBeTruthy();
  expect(screen.getByText(/Teaching · Mathematics/)).toBeTruthy();
  expect(screen.queryByText('Teaching staff')).toBeNull();

  fireEvent.changeText(
    screen.getByPlaceholderText('Search staff by name, subject, or role...'),
    'security'
  );
  expect(screen.getByText('Bob Guard')).toBeTruthy();
  expect(screen.getByText(/Non-teaching · Security/)).toBeTruthy();
});

test('classifies HOD and teachers as Teaching staff, not Non-teaching', async () => {
  const staffAttendance: SchoolAttendance = {
    ...attendanceData,
    staff: [
      {
        teacherId: 't1',
        name: 'Rina Pandey',
        initials: 'RP',
        subject: 'Science',
        phone: '',
        checkedIn: false,
        role: 'HOD',
      },
      {
        teacherId: 't2',
        name: 'Amit Yadav',
        initials: 'AY',
        subject: 'Math',
        phone: '',
        checkedIn: false,
        role: 'Senior Teacher',
      },
      {
        teacherId: 's1',
        name: 'Gate Guard',
        initials: 'GG',
        subject: '',
        phone: '',
        checkedIn: false,
        role: 'Security',
      },
    ],
  };

  const repos = {
    principal: { attendance: jest.fn(async () => staffAttendance) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('0/2 checked in')).toBeTruthy());
  expect(screen.getByText('0/1 checked in')).toBeTruthy();

  fireEvent.press(screen.getByText('Teaching staff'));
  await waitFor(() => expect(screen.getByText('Rina Pandey')).toBeTruthy());
  expect(screen.getByText('Amit Yadav')).toBeTruthy();
  expect(screen.queryByText('Gate Guard')).toBeNull();
});

test('shows empty state when no staff are configured', async () => {
  const repos = {
    principal: { attendance: jest.fn(async () => attendanceData) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() =>
    expect(screen.getByText('No staff configured for this school yet.')).toBeTruthy()
  );
});
