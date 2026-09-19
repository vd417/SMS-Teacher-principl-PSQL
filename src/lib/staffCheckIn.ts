import { formatTimeOfDay } from '@/lib/date';

export interface StaffCheckInFields {
  checkedIn: boolean;
  checkInAt?: string;
  checkOutAt?: string;
  checkInVerified?: boolean;
}

export function formatCheckInTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const t = formatTimeOfDay(iso);
  return t === '—' ? undefined : t;
}

/** Short status label for staff rows (principal views). Shows the check-in/check-out
 * range once both punches exist, otherwise just the open check-in time. */
export function staffCheckInStatus(entry: StaffCheckInFields): { label: string; flagged: boolean } {
  if (!entry.checkedIn) return { label: 'Out', flagged: false };

  const inTime = formatCheckInTime(entry.checkInAt);
  const outTime = formatCheckInTime(entry.checkOutAt);
  const flagged = entry.checkInVerified === false;

  const base = inTime && outTime ? `${inTime} – ${outTime}` : (inTime ?? 'In');
  return { label: flagged ? `${base} · flagged` : base, flagged };
}
