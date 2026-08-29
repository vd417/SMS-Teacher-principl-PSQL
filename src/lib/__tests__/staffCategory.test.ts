import {
  isTeachingDesignation,
  isTeachingStaff,
  isNonTeachingStaff,
  splitStaffByCategory,
  staffDisplayLabel,
} from '../staffCategory';
import type { StaffAttendanceEntry } from '@/data/domain';

const entry = (
  overrides: Partial<StaffAttendanceEntry> & Pick<StaffAttendanceEntry, 'teacherId' | 'name'>
): StaffAttendanceEntry => ({
  teacherId: overrides.teacherId,
  name: overrides.name,
  initials: overrides.initials ?? 'XX',
  subject: overrides.subject ?? '',
  phone: overrides.phone ?? '',
  checkedIn: overrides.checkedIn ?? false,
  designation: overrides.designation,
  role: overrides.role,
});

test('staffDisplayLabel prefers designation over subject', () => {
  expect(
    staffDisplayLabel({
      designation: 'Senior Teacher',
      role: undefined,
      subject: 'Arts',
    })
  ).toBe('Senior Teacher');
  expect(staffDisplayLabel({ designation: undefined, role: 'Driver', subject: 'Arts' })).toBe(
    'Driver'
  );
});

test('isTeachingDesignation recognizes common teaching titles', () => {
  expect(isTeachingDesignation('HOD')).toBe(true);
  expect(isTeachingDesignation('Senior Teacher')).toBe(true);
  expect(isTeachingDesignation('Teacher')).toBe(true);
  expect(isTeachingDesignation('teacher')).toBe(true);
  expect(isTeachingDesignation('Mathematics Teacher')).toBe(true);
});

test('isTeachingDesignation rejects non-teaching departments', () => {
  expect(isTeachingDesignation('Security')).toBe(false);
  expect(isTeachingDesignation('Guard')).toBe(false);
  expect(isTeachingDesignation('Peon')).toBe(false);
});

test('legacy API role values classify as teaching staff', () => {
  const hod = entry({
    teacherId: '1',
    name: 'Rina Pandey',
    role: 'HOD',
    subject: 'Science',
  });
  const senior = entry({
    teacherId: '2',
    name: 'Amit Yadav',
    role: 'Senior Teacher',
    subject: 'Math',
  });
  const teacher = entry({
    teacherId: '3',
    name: 'Mamata Krumari',
    role: 'Teacher',
    subject: 'English',
  });

  expect(isTeachingStaff(hod)).toBe(true);
  expect(isTeachingStaff(senior)).toBe(true);
  expect(isTeachingStaff(teacher)).toBe(true);
  expect(isNonTeachingStaff(hod)).toBe(false);
});

test('explicit designation classifies as teaching even when role is absent', () => {
  const member = entry({
    teacherId: '1',
    name: 'Rina Pandey',
    designation: 'HOD',
    subject: 'Science',
  });
  expect(isTeachingStaff(member)).toBe(true);
});

test('non-teaching role classifies as support staff', () => {
  const guard = entry({
    teacherId: '9',
    name: 'Gate Guard',
    role: 'Security',
  });
  expect(isNonTeachingStaff(guard)).toBe(true);
  expect(isTeachingStaff(guard)).toBe(false);
});

test('splitStaffByCategory separates teaching from non-teaching', () => {
  const staff = [
    entry({ teacherId: '1', name: 'Rina Pandey', role: 'HOD', subject: 'Science' }),
    entry({ teacherId: '2', name: 'Amit Yadav', role: 'Senior Teacher', subject: 'Math' }),
    entry({ teacherId: '3', name: 'Gate Guard', role: 'Security' }),
  ];

  const { teaching, nonTeaching } = splitStaffByCategory(staff);
  expect(teaching.map((s) => s.name)).toEqual(['Rina Pandey', 'Amit Yadav']);
  expect(nonTeaching.map((s) => s.name)).toEqual(['Gate Guard']);
});
