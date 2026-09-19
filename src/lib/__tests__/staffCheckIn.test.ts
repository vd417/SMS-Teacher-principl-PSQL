import { staffCheckInStatus } from '../staffCheckIn';

test('staffCheckInStatus shows out when not checked in', () => {
  expect(staffCheckInStatus({ checkedIn: false })).toEqual({ label: 'Out', flagged: false });
});

test('staffCheckInStatus shows time for verified check-in', () => {
  const at = '2026-07-29T10:16:00';
  const result = staffCheckInStatus({ checkedIn: true, checkInAt: at, checkInVerified: true });
  expect(result.flagged).toBe(false);
  expect(result.label).toMatch(/\d{1,2}:\d{2}/);
});

test('staffCheckInStatus marks unverified check-ins as flagged', () => {
  const at = '2026-07-29T10:16:00.000Z';
  const result = staffCheckInStatus({ checkedIn: true, checkInAt: at, checkInVerified: false });
  expect(result.flagged).toBe(true);
  expect(result.label).toContain('flagged');
});

test('staffCheckInStatus shows a check-in/check-out range once both punches exist', () => {
  const result = staffCheckInStatus({
    checkedIn: true,
    checkInAt: '2026-07-29T10:16:00.000Z',
    checkOutAt: '2026-07-29T16:30:00.000Z',
    checkInVerified: true,
  });
  expect(result.flagged).toBe(false);
  expect(result.label).toMatch(/\d{1,2}:\d{2}.*–.*\d{1,2}:\d{2}/);
});
