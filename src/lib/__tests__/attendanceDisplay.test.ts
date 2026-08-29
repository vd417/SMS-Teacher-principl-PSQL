import {
  formatPunchDistance,
  formatAttendanceHours,
  punchSuccessMessage,
  punchErrorMessage,
} from '@/lib/attendanceDisplay';
import { AppError } from '@/lib/errors';
import type { CheckEvent } from '@/data/domain';

const base: CheckEvent = {
  kind: 'in',
  at: '2026-07-30T06:00:00.000Z',
  lat: 1,
  lng: 2,
  accuracyMeters: 5,
  distanceMeters: 0,
  verified: false,
};

test('formatPunchDistance explains missing school location', () => {
  expect(formatPunchDistance(base, false)).toContain('not set');
});

test('formatPunchDistance shows meters when school is configured', () => {
  expect(formatPunchDistance({ ...base, distanceMeters: 42, verified: true }, true)).toBe(
    '42 m from school'
  );
});

test('formatAttendanceHours formats with unit', () => {
  expect(formatAttendanceHours(1.57)).toBe('1.6 h');
  expect(formatAttendanceHours(0)).toBe('0 h');
  expect(formatAttendanceHours(undefined)).toBe('–');
});

test('punchSuccessMessage warns when outside campus', () => {
  const ev = { ...base, distanceMeters: 1799, verified: false };
  const { msg, type } = punchSuccessMessage('in', ev, { geo: true, schoolConfigured: true });
  expect(type).toBe('warning');
  expect(msg).toContain('outside the school campus');
  expect(msg).toContain('km');
});

test('punchErrorMessage maps outside_geofence', () => {
  const msg = punchErrorMessage(
    new AppError({ code: 'outside_geofence', status: 422, message: 'raw' })
  );
  expect(msg).toContain('outside the school campus');
});
