import { formatTimeOfDay } from '@/lib/date';

export interface StaffCheckInFields {
  checkedIn: boolean;
  checkInAt?: string;
  checkInVerified?: boolean;
}

export function formatCheckInTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const t = formatTimeOfDay(iso);
  return t === '—' ? undefined : t;
}

/** Short status label for staff rows (principal views). */
export function staffCheckInStatus(entry: StaffCheckInFields): { label: string; flagged: boolean } {
  if (!entry.checkedIn) return { label: 'Out', flagged: false };

  const time = formatCheckInTime(entry.checkInAt);
  const flagged = entry.checkInVerified === false;
  if (time) return { label: flagged ? `${time} · flagged` : time, flagged };
  return { label: flagged ? 'In · flagged' : 'In', flagged };
}
