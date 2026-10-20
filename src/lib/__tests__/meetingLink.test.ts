import { meetingUrl } from '../meetingLink';

test('keeps a full Google Meet or Zoom link', () => {
  expect(meetingUrl('https://meet.google.com/abc-defg-hij')).toBe(
    'https://meet.google.com/abc-defg-hij'
  );
  expect(meetingUrl('https://zoom.us/j/123456789')).toBe('https://zoom.us/j/123456789');
});

test('adds https when the link has a host but no scheme', () => {
  expect(meetingUrl('meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
  expect(meetingUrl('zoom.us/j/123')).toBe('https://zoom.us/j/123');
});

test('returns null for a blank link', () => {
  expect(meetingUrl('   ')).toBeNull();
});
