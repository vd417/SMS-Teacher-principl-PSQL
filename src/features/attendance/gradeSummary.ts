import type { AttendanceRecord } from '@/data/domain';

export interface SectionAttendance {
  total: number;
  present: number;
}

export interface GradeAttendanceSummary {
  present: number;
  total: number;
  /** Percentage 0-100, rounded. null when the grade has no students in any section. */
  pct: number | null;
}

/** Counts 'P' (Present) records; unmarked/undefined records count as 0. */
export function countPresent(records: AttendanceRecord[] | undefined): number {
  return records?.filter((r) => r.status === 'P').length ?? 0;
}

/**
 * Sums per-section totals into a grade-level summary. A section that hasn't
 * been marked yet today still contributes its full roster to `total` (with 0
 * `present`), so an unmarked section pulls the grade's percentage down rather
 * than being excluded from the count.
 */
export function aggregateSections(sections: SectionAttendance[]): GradeAttendanceSummary {
  const total = sections.reduce((sum, s) => sum + s.total, 0);
  const present = sections.reduce((sum, s) => sum + s.present, 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : null;
  return { present, total, pct };
}
