import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AttendanceScreen, rollLabel, statusChipColors, studentRowTint } from '../AttendanceScreen';
import { Colors } from '../../theme';
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
  grade: '',
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
const slot = {
  id: 'slot1',
  period: 2,
  subject: 'Math',
  subjectId: 'sub1',
  startTime: '00:00',
  endTime: '23:59',
  teacherId: 't1',
  teacherName: 'Ravi Kumar',
  isCurrent: false,
  marked: false,
  canMark: true,
};

function periodRepos(overrides: Partial<Repositories['attendance']> = {}) {
  return {
    forClass: jest.fn(async () => []),
    rollCall: jest.fn(async () => ({
      canMark: true,
      period: 2,
      subject: 'Math',
      teacherName: 'Ravi',
      reason: 'ok',
      marked: false,
    })),
    dayTimetable: jest.fn(async () => [slot]),
    forPeriod: jest.fn(
      async () => [] as { studentId: string; status: 'P' | 'A' | 'L' | 'V'; date: string }[]
    ),
    save: jest.fn(async () => undefined),
    savePeriod: jest.fn(async () => undefined),
    ...overrides,
  };
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
            <AttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function classRepos(attendance: ReturnType<typeof periodRepos>) {
  return {
    classes: { get: jest.fn(async () => cls) },
    students: {
      listByClass: jest.fn(async () => ({ items: [student], nextCursor: null })),
    },
    attendance,
  } as unknown as Repositories;
}

async function openPeriod() {
  await waitFor(() => expect(screen.getByLabelText('P2 · Math')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('P2 · Math'));
  await waitFor(() => expect(screen.getByText('Asha')).toBeTruthy());
}

beforeEach(() => {
  mockGoBack.mockClear();
});

test('rollLabel hides empty and zero rolls', () => {
  expect(rollLabel('0')).toBeNull();
  expect(rollLabel('')).toBeNull();
  expect(rollLabel('12')).toBe('Roll #12');
});

test('statusChipColors colour-codes each status even when not selected', () => {
  expect(statusChipColors('P', false).color).toBe(Colors.present);
  expect(statusChipColors('A', false).color).toBe(Colors.absent);
  expect(statusChipColors('L', false).color).toBe(Colors.late);
  expect(statusChipColors('V', false).color).toBe(Colors.leave);
});

test('statusChipColors fills the selected chip with its status colour', () => {
  expect(statusChipColors('P', true)).toEqual({
    backgroundColor: Colors.present,
    borderColor: Colors.present,
    color: Colors.white,
  });
  expect(statusChipColors('A', true).backgroundColor).toBe(Colors.absent);
});

test('studentRowTint matches the marked status', () => {
  expect(studentRowTint('A')).toBe(Colors.absentSoft);
  expect(studentRowTint(undefined)).toBe(Colors.card);
});

test('shows period list without students until a period is tapped', async () => {
  renderScreen(classRepos(periodRepos()));

  await waitFor(() => expect(screen.getByText(/P2 · Math/)).toBeTruthy());
  expect(screen.getByText('NOW')).toBeTruthy();
  expect(screen.getByText(/00:00–23:59/)).toBeTruthy();
  expect(screen.queryByText('Asha')).toBeNull();
  expect(screen.queryByText('Mark All Present')).toBeNull();
  expect(screen.queryByText(/Submit Attendance/)).toBeNull();
});

test('shows lunch break with times between morning and afternoon periods', async () => {
  const morning = {
    ...slot,
    id: 'p4',
    period: 4,
    subject: 'Science',
    startTime: '11:15',
    endTime: '12:00',
    isCurrent: false,
  };
  const afternoon = {
    ...slot,
    id: 'p5',
    period: 5,
    subject: 'Hindi',
    startTime: '12:40',
    endTime: '13:25',
    isCurrent: false,
  };
  renderScreen(
    classRepos(
      periodRepos({
        dayTimetable: jest.fn(async () => [morning, afternoon]),
      })
    )
  );

  await waitFor(() => expect(screen.getByText('Lunch break')).toBeTruthy());
  expect(screen.getByText('12:00–12:40')).toBeTruthy();
});

test('tapping a period shows students with Present Absent Late Leave actions', async () => {
  renderScreen(classRepos(periodRepos()));

  await openPeriod();

  expect(screen.getByLabelText('Asha Present')).toBeTruthy();
  expect(screen.getByLabelText('Asha Absent')).toBeTruthy();
  expect(screen.getByLabelText('Asha Late')).toBeTruthy();
  expect(screen.getByLabelText('Asha Leave')).toBeTruthy();
});

test('back from students returns to the period list', async () => {
  renderScreen(classRepos(periodRepos()));

  await openPeriod();
  fireEvent.press(screen.getByLabelText('Go back'));

  await waitFor(() => expect(screen.queryByText('Asha')).toBeNull());
  expect(screen.getByText(/P2 · Math/)).toBeTruthy();
  expect(mockGoBack).not.toHaveBeenCalled();
});

test('stays on screen after updating saved attendance', async () => {
  jest.useFakeTimers();
  const attendance = periodRepos({
    forPeriod: jest.fn(async () => [{ studentId: 's1', status: 'A' as const, date: '2026-07-29' }]),
    dayTimetable: jest.fn(async () => [{ ...slot, marked: true }]),
  });

  renderScreen(classRepos(attendance));

  await openPeriod();
  fireEvent.press(screen.getByLabelText('Asha Present'));
  fireEvent.press(screen.getByText(/Update Attendance/));

  await waitFor(() => expect(attendance.savePeriod).toHaveBeenCalled());
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockGoBack).not.toHaveBeenCalled();

  jest.useRealTimers();
});

test('navigates back ~1s after a successful save', async () => {
  jest.useFakeTimers();
  const attendance = periodRepos();

  renderScreen(classRepos(attendance));

  await openPeriod();
  fireEvent.press(screen.getByText('Mark All Present'));
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(attendance.savePeriod).toHaveBeenCalled());
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(mockGoBack).toHaveBeenCalled();

  jest.useRealTimers();
});

test('shows view-only when period cannot be marked', async () => {
  const attendance = periodRepos({
    dayTimetable: jest.fn(async () => [{ ...slot, canMark: false }]),
  });

  renderScreen(classRepos(attendance));

  await openPeriod();
  expect(
    screen.getByText(/Only the period teacher, class teacher, or leadership can mark this period/)
  ).toBeTruthy();
  expect(screen.queryByText('Mark All Present')).toBeNull();
});

test('surfaces API save failures without navigating away', async () => {
  const attendance = periodRepos({
    savePeriod: jest.fn(async () => {
      throw new Error('forbidden');
    }),
  });

  renderScreen(classRepos(attendance));

  await openPeriod();
  fireEvent.press(screen.getByText('Mark All Present'));
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(screen.getByText(/forbidden/i)).toBeTruthy());
  expect(mockGoBack).not.toHaveBeenCalled();
});
