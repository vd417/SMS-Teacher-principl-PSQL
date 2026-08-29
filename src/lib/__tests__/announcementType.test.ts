import { mapAnnouncementType } from '../announcementType';

test('mapAnnouncementType keeps native app types', () => {
  expect(mapAnnouncementType('info')).toBe('info');
  expect(mapAnnouncementType('warning')).toBe('warning');
  expect(mapAnnouncementType('event')).toBe('event');
  expect(mapAnnouncementType('urgent')).toBe('urgent');
});

test('mapAnnouncementType maps CRM defaults and channel tags to info', () => {
  expect(mapAnnouncementType('general')).toBe('info');
  expect(mapAnnouncementType('email+sms+app')).toBe('info');
  expect(mapAnnouncementType('exam_datesheet')).toBe('info');
  expect(mapAnnouncementType('fee_receipt')).toBe('info');
});

test('mapAnnouncementType maps calendar and alert-style CRM types', () => {
  expect(mapAnnouncementType('calendar')).toBe('event');
  expect(mapAnnouncementType('attendance_alert')).toBe('urgent');
  expect(mapAnnouncementType('fee_reminder')).toBe('warning');
  expect(mapAnnouncementType('fee_receipt')).toBe('info');
});
