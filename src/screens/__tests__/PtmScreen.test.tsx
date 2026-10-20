import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PtmScreen } from '../PtmScreen';
import { openMeetingLink } from '@/lib/meetingLink';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AppError } from '@/lib/errors';
import type { Repositories } from '@/data/repositories/types';
import type { Class, PtmMeeting, Student } from '@/data/domain';

jest.setTimeout(20000);

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
jest.mock('@/lib/meetingLink', () => ({
  openMeetingLink: jest.fn(async () => true),
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

const classFiveA: Class = {
  id: 'class-1',
  name: '5',
  grade: '5',
  section: 'A',
  subject: '',
  studentCount: 1,
  room: '',
};

const student: Student = {
  id: 'student-1',
  name: 'Aarav Sharma',
  roll: '1',
  initials: 'AS',
  classId: 'class-1',
  attendance: null,
  grade: '5',
  parent: '',
  parentPhone: '',
  photoUrl: null,
};

function makeRepos(
  overrides: Partial<Repositories['ptm']> = {},
  classes: Class[] = []
): Repositories {
  return {
    ptm: {
      list: jest.fn(async () => [meeting]),
      create: jest.fn(),
      remove: jest.fn(),
      ...overrides,
    },
    classes: { list: jest.fn(async () => classes) },
    timetable: { list: jest.fn(async () => []) },
    teachers: { list: jest.fn(async () => []) },
    students: {
      listByClass: jest.fn(async () => ({
        items: classes.length ? [student] : [],
        nextCursor: null,
      })),
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

test('shows the New meeting action for a principal', async () => {
  mockRole = 'principal';
  renderScreen(makeRepos());

  await waitFor(() => expect(screen.getByText('Mrs. Rao')).toBeTruthy());
  expect(screen.getByText('Math')).toBeTruthy();

  expect(screen.getByLabelText('New meeting')).toBeTruthy();
  expect(screen.getByText('Any class in this school')).toBeTruthy();
});

test('shows the New meeting action for a teacher', async () => {
  mockRole = 'teacher';
  renderScreen(makeRepos());

  await waitFor(() => expect(screen.getByText('Mrs. Rao')).toBeTruthy());
  expect(screen.getByText('Math')).toBeTruthy();

  expect(screen.getByLabelText('New meeting')).toBeTruthy();
});

test('opens a class’s section and shows the student list', async () => {
  renderScreen(makeRepos({}, [classFiveA]));

  await waitFor(() => expect(screen.getByText('Mrs. Rao')).toBeTruthy());
  expect(screen.getByText('Math')).toBeTruthy();

  fireEvent.press(screen.getByLabelText('Open Mrs. Rao Math'));

  await waitFor(() => expect(screen.getByText('Section A')).toBeTruthy());

  fireEvent.press(screen.getByLabelText('Open Section A'));

  await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());
});

test('opens a Google Meet, Zoom, or other meeting link', async () => {
  renderScreen(
    makeRepos({
      list: jest.fn(async () => [
        { ...meeting, meetingLink: 'https://meet.google.com/abc-defg-hij' },
      ]),
    })
  );

  await waitFor(() => expect(screen.getByLabelText('Open meeting link')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Open meeting link'));

  await waitFor(() =>
    expect(openMeetingLink).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij')
  );
});

test('shows the server error message when cancelling a meeting fails', async () => {
  const remove = jest.fn(async () => {
    throw new AppError({ code: 'not_found', status: 404, message: 'Meeting not found' });
  });
  renderScreen(makeRepos({ remove }));

  await waitFor(() => expect(screen.getByText('Cancel meeting')).toBeTruthy());
  fireEvent.press(screen.getByText('Cancel meeting'));
  fireEvent.press(screen.getByLabelText('Continue'));

  fireEvent.changeText(screen.getByPlaceholderText('Type the reason'), 'Parent unavailable');
  fireEvent.press(screen.getByLabelText('Cancel and notify'));

  await waitFor(() =>
    expect(remove).toHaveBeenCalledWith('ptm-1', {
      reason: 'Parent unavailable',
      notify: true,
      teacherIds: ['teacher-1'],
      allTeachers: false,
    })
  );
  await waitFor(() => expect(screen.getByText('Meeting not found')).toBeTruthy());
});

test('removes the meeting after the parent notice is sent', async () => {
  const remove = jest.fn(async () => {});
  renderScreen(makeRepos({ remove }));

  await waitFor(() => expect(screen.getByText('Mrs. Rao')).toBeTruthy());
  fireEvent.press(screen.getByText('Cancel meeting'));
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.changeText(screen.getByPlaceholderText('Type the reason'), 'Parent unavailable');
  fireEvent.press(screen.getByLabelText('Cancel and notify'));

  await waitFor(() => expect(screen.queryByText('Mrs. Rao')).toBeNull());
  expect(
    screen.getByText('Notice sent to the parent, the teacher app, and CRM: Parent unavailable')
  ).toBeTruthy();
});
