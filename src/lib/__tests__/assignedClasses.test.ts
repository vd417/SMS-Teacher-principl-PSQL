import { classesForRole, assignedClassIdsForTeacher } from '@/lib/assignedClasses';
import type { Class, TimetableSlot } from '@/data/domain';

const cls = (id: string, name: string, section: string, grade = name): Class => ({
  id,
  name,
  grade,
  section,
  subject: 'Math',
  studentCount: 30,
  room: '101',
});

const slot = (classId: string): TimetableSlot => ({
  id: `slot-${classId}`,
  day: 'Mon',
  period: 1,
  subject: 'Math',
  classId,
  className: 'IX-A',
  room: '101',
  startTime: '09:00',
  endTime: '09:45',
  teacherName: 'Teacher',
});

describe('assignedClassIdsForTeacher', () => {
  it('collects class ids from timetable slots', () => {
    const classes = [cls('c1', 'IX', 'A'), cls('c2', 'IX', 'B')];
    const ids = assignedClassIdsForTeacher(classes, [slot('c1')]);
    expect([...ids]).toEqual(['c1']);
  });

  it('includes homeroom class from profile label', () => {
    const classes = [cls('c1', 'IX', 'A'), cls('c2', 'IX', 'B')];
    const ids = assignedClassIdsForTeacher(classes, [], 'IX – A');
    expect([...ids]).toEqual(['c1']);
  });
});

describe('classesForRole', () => {
  const all = [cls('c1', 'IX', 'A'), cls('c2', 'IX', 'B'), cls('c3', 'X', 'A')];

  it('returns every class for principal', () => {
    expect(classesForRole(all, 'principal')).toHaveLength(3);
  });

  it('narrows teacher list using timetable linkage', () => {
    const visible = classesForRole(all, 'teacher', { timetable: [slot('c1'), slot('c2')] });
    expect(visible.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('keeps API-scoped classes when no linkage hints exist', () => {
    const scoped = [cls('c1', 'IX', 'A')];
    expect(classesForRole(scoped, 'teacher')).toEqual(scoped);
  });
});
