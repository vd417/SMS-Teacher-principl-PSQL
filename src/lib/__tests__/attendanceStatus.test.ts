import { parseAttendanceStatus } from '../attendanceStatus';

test('parseAttendanceStatus normalizes API words and single-letter codes', () => {
  expect(parseAttendanceStatus('present')).toBe('P');
  expect(parseAttendanceStatus('Present')).toBe('P');
  expect(parseAttendanceStatus('P')).toBe('P');
  expect(parseAttendanceStatus('late')).toBe('L');
  expect(parseAttendanceStatus('leave')).toBe('V');
});
