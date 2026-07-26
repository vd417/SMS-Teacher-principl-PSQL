import { countPresent, aggregateSections } from '../gradeSummary';
import type { AttendanceRecord } from '@/data/domain';

describe('countPresent', () => {
  test('counts only P-status records', () => {
    const records: AttendanceRecord[] = [
      { studentId: 's1', status: 'P', date: '2026-07-26' },
      { studentId: 's2', status: 'A', date: '2026-07-26' },
      { studentId: 's3', status: 'P', date: '2026-07-26' },
      { studentId: 's4', status: 'L', date: '2026-07-26' },
    ];
    expect(countPresent(records)).toBe(2);
  });

  test('returns 0 for undefined (section not marked yet)', () => {
    expect(countPresent(undefined)).toBe(0);
  });

  test('returns 0 for an empty array', () => {
    expect(countPresent([])).toBe(0);
  });
});

describe('aggregateSections', () => {
  test('sums present and total across sections', () => {
    const result = aggregateSections([
      { total: 30, present: 28 },
      { total: 32, present: 30 },
    ]);
    expect(result).toEqual({ present: 58, total: 62, pct: 94 });
  });

  test('an unmarked section (present: 0) still counts its roster toward total', () => {
    const result = aggregateSections([
      { total: 30, present: 28 }, // marked
      { total: 32, present: 0 }, // not marked yet today
    ]);
    expect(result).toEqual({ present: 28, total: 62, pct: 45 });
  });

  test('rounds the percentage', () => {
    const result = aggregateSections([{ total: 3, present: 1 }]);
    expect(result.pct).toBe(33);
  });

  test('pct is null when there are no students in any section', () => {
    const result = aggregateSections([{ total: 0, present: 0 }]);
    expect(result.pct).toBeNull();
  });

  test('handles an empty sections array', () => {
    expect(aggregateSections([])).toEqual({ present: 0, total: 0, pct: null });
  });
});
