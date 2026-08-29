import type { AttendanceStatus } from '@/data/domain';

/** Normalize CRM / API attendance status strings to roll-call codes. */
export function parseAttendanceStatus(raw: string): AttendanceStatus {
  const key = raw.trim().toLowerCase();
  if (key === 'p' || key === 'present') return 'P';
  if (key === 'a' || key === 'absent' || key === 'holiday') return 'A';
  if (key === 'l' || key === 'late') return 'L';
  if (key === 'v' || key === 'leave') return 'V';
  return 'A';
}
