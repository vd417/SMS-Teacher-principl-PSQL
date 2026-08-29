import type { Class, TimetableSlot } from '@/data/domain';
import { classIdsForTeacher } from '../academicsScope';

const classes: Class[] = [
  { id: 'c1', name: 'IX', grade: 'IX', section: 'A', subject: 'Math', studentCount: 30, room: '1' },
  { id: 'c2', name: 'X', grade: 'X', section: 'B', subject: 'Sci', studentCount: 28, room: '2' },
];

const timetable: TimetableSlot[] = [
  {
    id: 's1',
    day: 'Mon',
    period: 1,
    subject: 'Math',
    classId: 'c2',
    className: 'X-B',
    room: '2',
    startTime: '09:00',
    endTime: '09:45',
    teacherName: 'Meera Krishnan',
  },
];

describe('classIdsForTeacher', () => {
  it('includes homeroom class and timetable classes by teacher name', () => {
    const ids = classIdsForTeacher(
      't1',
      'Meera Krishnan',
      [{ ...classes[0], classTeacherId: 't1' }, classes[1]],
      timetable
    );
    expect([...ids].sort()).toEqual(['c1', 'c2']);
  });
});
