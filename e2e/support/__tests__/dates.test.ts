import { lastSchoolDay } from '../dates';

test('a weekday returns itself', () => {
  expect(lastSchoolDay(new Date(2026, 8, 23))).toBe('2026-09-23'); // Wed
});
test('Saturday and Sunday fall back to Friday', () => {
  expect(lastSchoolDay(new Date(2026, 8, 26))).toBe('2026-09-25'); // Sat
  expect(lastSchoolDay(new Date(2026, 8, 27))).toBe('2026-09-25'); // Sun
});
test('crosses a month boundary', () => {
  expect(lastSchoolDay(new Date(2026, 10, 1))).toBe('2026-10-30'); // Sun 1 Nov → Fri 30 Oct
});
