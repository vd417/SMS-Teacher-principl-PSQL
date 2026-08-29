import { cellFor, periodBellTimes } from '../ScheduleScreen';
import type { TimetableSlot } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mondayMath: TimetableSlot = {
  id: 'slot-1',
  day: 'Mon',
  period: 1,
  subject: 'Math',
  classId: 'c1',
  className: 'IV-A',
  room: '101',
  startTime: '08:15',
  endTime: '09:00',
  teacherName: 'Ravi Kumar',
};

test('cellFor leaves an unscheduled day and period empty', () => {
  expect(cellFor([mondayMath], 'Tue', 1)).toBeNull();
});

test('cellFor returns the lesson scheduled in the exact day and period', () => {
  expect(cellFor([mondayMath], 'Mon', 1)).toEqual({
    subject: 'Math',
    className: 'IV-A',
    room: '101',
    classId: 'c1',
    startTime: '08:15',
    endTime: '09:00',
  });
});

test('periodBellTimes uses published slot times (not hardcoded 08:00)', () => {
  expect(periodBellTimes([mondayMath], 1)).toEqual({ start: '08:15', end: '09:00' });
  expect(periodBellTimes([mondayMath], 2)).toEqual({ start: '—', end: '—' });
});
