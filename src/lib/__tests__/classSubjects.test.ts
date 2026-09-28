import { classSubjectForTeacher } from '../classSubjects';
import type { TimetableSlot } from '@/data/domain';

function slot(over: Partial<TimetableSlot>): TimetableSlot {
  return {
    id: 's1',
    day: 'Mon',
    period: 1,
    subject: 'Mathematics',
    classId: 'ix-a',
    className: 'IX-A',
    room: 'R101',
    startTime: '09:00',
    endTime: '09:40',
    teacherName: 'Asha Kulkarni',
    ...over,
  };
}

test('A-1: shows the signed-in teacher own subject in a class, not the class-level column', () => {
  const timetable: TimetableSlot[] = [
    slot({ id: 's1', period: 1, subject: 'Mathematics', teacherName: 'Asha Kulkarni' }),
    slot({ id: 's2', period: 2, subject: 'Science', teacherName: 'Bharat Menon' }),
  ];

  const subject = classSubjectForTeacher(
    { id: 'ix-a', subject: 'Mathematics' },
    timetable,
    'Bharat Menon'
  );

  expect(subject).toBe('Science');
});

test('A-1: joins multiple subjects the teacher teaches in the same class', () => {
  const timetable: TimetableSlot[] = [
    slot({ id: 's1', period: 1, subject: 'Mathematics', teacherName: 'Asha Kulkarni' }),
    slot({ id: 's2', period: 4, subject: 'Moral Science', teacherName: 'Asha Kulkarni' }),
  ];

  const subject = classSubjectForTeacher(
    { id: 'ix-a', subject: 'Mathematics' },
    timetable,
    'Asha Kulkarni'
  );

  expect(subject).toBe('Mathematics, Moral Science');
});

test('A-1: falls back to the class-level subject when the teacher has no slots in this class', () => {
  const timetable: TimetableSlot[] = [
    slot({ id: 's1', period: 1, subject: 'Mathematics', teacherName: 'Asha Kulkarni' }),
  ];

  const subject = classSubjectForTeacher(
    { id: 'ix-a', subject: 'Mathematics' },
    timetable,
    'Someone Else'
  );

  expect(subject).toBe('Mathematics');
});
