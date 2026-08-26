import {
  homeworkPeriodsForSubject,
  homeworkSubjectsForClass,
  slotsTaughtByTeacher,
} from '../homeworkSubjects';
import type { TimetableSlot } from '@/data/domain';

function slot(
  classId: string,
  subject: string,
  period: number,
  extra: Partial<TimetableSlot> = {}
): TimetableSlot {
  return {
    id: `${classId}-${period}-${subject}`,
    day: 'Wed',
    period,
    subject,
    classId,
    className: 'IV-B',
    room: '',
    startTime: '',
    endTime: '',
    teacherName: 'Me',
    ...extra,
  };
}

test('homeworkSubjectsForClass lists unique timetable subjects for that class', () => {
  expect(
    homeworkSubjectsForClass(
      [
        slot('c1', 'Music', 2),
        slot('c1', 'Mathematics', 1),
        slot('c1', 'Music', 8),
        slot('c2', 'Hindi', 3),
      ],
      'c1'
    )
  ).toEqual(['Mathematics', 'Music']);
});

test('a teacher only sees subjects assigned to them on that class timetable', () => {
  expect(
    homeworkSubjectsForClass(
      [
        slot('c1', 'Music', 2, { teacherName: 'Asha Rao' }),
        slot('c1', 'Mathematics', 1, { teacherName: 'Ravi Kumar' }),
        slot('c1', 'Music', 8, { teacherName: 'Asha Rao' }),
        slot('c1', 'Hindi', 3, { teacherName: 'Meera Krishnan' }),
      ],
      'c1',
      'Asha Rao'
    )
  ).toEqual(['Music']);
});

test('principal (no teacher filter) sees every subject on the class timetable', () => {
  expect(
    homeworkSubjectsForClass(
      [
        slot('c1', 'Music', 2, { teacherName: 'Asha Rao' }),
        slot('c1', 'Mathematics', 1, { teacherName: 'Ravi Kumar' }),
      ],
      'c1'
    )
  ).toEqual(['Mathematics', 'Music']);
});

test('homeworkPeriodsForSubject lists unique periods for class + subject', () => {
  expect(
    homeworkPeriodsForSubject(
      [slot('c1', 'Music', 8), slot('c1', 'Music', 2), slot('c1', 'Mathematics', 1)],
      'c1',
      'Music'
    )
  ).toEqual([2, 8]);
});

test('a teacher only gets periods they teach for that subject', () => {
  expect(
    homeworkPeriodsForSubject(
      [
        slot('c1', 'Music', 2, { teacherName: 'Asha Rao' }),
        slot('c1', 'Music', 8, { teacherName: 'Ravi Kumar' }),
      ],
      'c1',
      'Music',
      'Asha Rao'
    )
  ).toEqual([2]);
});

test('a teacher only sees their own timetable subjects on that weekday', () => {
  expect(
    homeworkSubjectsForClass(
      [
        slot('c1', 'Mathematics', 1, { day: 'Wed', teacherName: 'Amit Yadav' }),
        slot('c1', 'Physical Education', 3, { day: 'Wed', teacherName: 'Amit Yadav' }),
        slot('c1', 'Hindi', 1, { day: 'Tue', teacherName: 'Amit Yadav' }),
        slot('c1', 'Music', 2, { day: 'Wed', teacherName: 'Mamata Krumari' }),
      ],
      'c1',
      'Amit Yadav',
      'Wed'
    )
  ).toEqual(['Mathematics', 'Physical Education']);
});

test('a teacher only gets periods they teach on that weekday', () => {
  expect(
    homeworkPeriodsForSubject(
      [
        slot('c1', 'Mathematics', 1, { day: 'Wed', teacherName: 'Amit Yadav' }),
        slot('c1', 'Mathematics', 7, { day: 'Fri', teacherName: 'Amit Yadav' }),
      ],
      'c1',
      'Mathematics',
      'Amit Yadav',
      'Wed'
    )
  ).toEqual([1]);
});

test("slotsTaughtByTeacher keeps only this teacher's timetable rows", () => {
  const rows = [
    { teacherName: 'Amit Yadav', subject: 'Mathematics' },
    { teacherName: 'Mamata Krumari', subject: 'Music' },
    { teacherName: 'Amit Yadav', subject: 'Computer' },
  ];
  expect(slotsTaughtByTeacher(rows, 'Amit Yadav').map((r) => r.subject)).toEqual([
    'Mathematics',
    'Computer',
  ]);
  expect(slotsTaughtByTeacher(rows, null)).toHaveLength(3);
});
