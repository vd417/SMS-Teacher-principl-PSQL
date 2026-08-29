import type { ClassDayTimetableSlot } from '@/data/repositories/types';

export const LUNCH_AFTER_PERIOD = 4;

export type AttendancePeriodRow =
  | { kind: 'slot'; slot: ClassDayTimetableSlot }
  | { kind: 'lunch'; startTime: string | null; endTime: string | null; isCurrent: boolean };

export function parseHmToMinutes(hm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((hm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function localMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Live NOW from school-local bell times — ignore stale API `is_current`. */
export function isSlotCurrent(
  slot: Pick<ClassDayTimetableSlot, 'startTime' | 'endTime'>,
  nowMinutes: number | null
): boolean {
  if (nowMinutes == null) return false;
  const start = parseHmToMinutes(slot.startTime);
  const end = parseHmToMinutes(slot.endTime);
  if (start == null || end == null) return false;
  return nowMinutes >= start && nowMinutes < end;
}

function withLiveCurrent(
  slot: ClassDayTimetableSlot,
  nowMinutes: number | null
): ClassDayTimetableSlot {
  return { ...slot, isCurrent: isSlotCurrent(slot, nowMinutes) };
}

export function lunchWindow(
  slots: ClassDayTimetableSlot[],
  afterPeriod = LUNCH_AFTER_PERIOD
): { startTime: string | null; endTime: string | null } {
  const morning = slots
    .filter((s) => s.period <= afterPeriod)
    .sort((a, b) => b.period - a.period)[0];
  const afternoon = slots
    .filter((s) => s.period > afterPeriod)
    .sort((a, b) => a.period - b.period)[0];
  return {
    startTime: morning?.endTime ?? null,
    endTime: afternoon?.startTime ?? null,
  };
}

export function attendancePeriodRows(
  slots: ClassDayTimetableSlot[],
  nowMinutes: number | null,
  afterPeriod = LUNCH_AFTER_PERIOD
): AttendancePeriodRow[] {
  const sorted = [...slots].sort((a, b) => a.period - b.period);
  const hasMorning = sorted.some((s) => s.period <= afterPeriod);
  const hasAfternoon = sorted.some((s) => s.period > afterPeriod);
  if (!hasMorning || !hasAfternoon) {
    return sorted.map((slot) => ({
      kind: 'slot' as const,
      slot: withLiveCurrent(slot, nowMinutes),
    }));
  }

  const lunch = lunchWindow(sorted, afterPeriod);
  const startM = parseHmToMinutes(lunch.startTime);
  const endM = parseHmToMinutes(lunch.endTime);
  const lunchCurrent =
    nowMinutes != null &&
    startM != null &&
    endM != null &&
    nowMinutes >= startM &&
    nowMinutes < endM;

  const rows: AttendancePeriodRow[] = [];
  let inserted = false;
  for (const slot of sorted) {
    if (!inserted && slot.period > afterPeriod) {
      rows.push({
        kind: 'lunch',
        startTime: lunch.startTime,
        endTime: lunch.endTime,
        isCurrent: lunchCurrent,
      });
      inserted = true;
    }
    rows.push({ kind: 'slot', slot: withLiveCurrent(slot, nowMinutes) });
  }
  return rows;
}

export function lunchTimeLabel(startTime: string | null, endTime: string | null): string {
  if (startTime && endTime) return `${startTime}–${endTime}`;
  if (startTime) return `from ${startTime}`;
  if (endTime) return `until ${endTime}`;
  return '';
}
