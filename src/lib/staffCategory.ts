import type { StaffAttendanceEntry } from '@/data/domain';

/** Teaching titles the API may send in `role` before designation is split out. */
const TEACHING_DESIGNATIONS = new Set([
  'teacher',
  'hod',
  'head of department',
  'senior teacher',
  'assistant teacher',
  'junior teacher',
  'subject teacher',
  'class teacher',
  'vice principal',
  'principal',
]);

export function isTeachingDesignation(value: string): boolean {
  const norm = value.trim().toLowerCase();
  if (!norm) return false;
  if (TEACHING_DESIGNATIONS.has(norm)) return true;
  return norm.endsWith(' teacher');
}

/** True when `role` is a non-teaching department (Security, Guard, Peon, …). */
export function isNonTeachingStaff(
  entry: Pick<StaffAttendanceEntry, 'role' | 'designation'>
): boolean {
  if (entry.designation) return false;
  if (!entry.role) return false;
  return !isTeachingDesignation(entry.role);
}

/** Department / designation line for principal staff rows (designation before subject). */
export function staffDisplayLabel(
  entry: Pick<StaffAttendanceEntry, 'designation' | 'role' | 'subject'>
): string {
  return entry.designation || entry.role || entry.subject || 'Staff';
}

export function isTeachingStaff(
  entry: Pick<StaffAttendanceEntry, 'role' | 'designation'>
): boolean {
  return !isNonTeachingStaff(entry);
}

export function splitStaffByCategory<T extends StaffAttendanceEntry>(
  staff: T[]
): {
  teaching: T[];
  nonTeaching: T[];
} {
  const teaching: T[] = [];
  const nonTeaching: T[] = [];
  for (const member of staff) {
    (isNonTeachingStaff(member) ? nonTeaching : teaching).push(member);
  }
  return { teaching, nonTeaching };
}
