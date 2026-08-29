import { findSchoolClosedToday } from '@/lib/schoolDay';
import type { Announcement, CalendarEvent } from '@/data/domain';

const today = '2026-07-31';

test('findSchoolClosedToday returns calendar holiday for today', () => {
  const calendar: CalendarEvent[] = [
    { id: '1', title: 'Independence Day', date: today, type: 'holiday' },
  ];
  expect(findSchoolClosedToday(today, calendar)?.title).toBe('Independence Day');
});

test('findSchoolClosedToday ignores holidays on other days', () => {
  const calendar: CalendarEvent[] = [
    { id: '1', title: 'Summer break', date: '2026-08-01', type: 'holiday' },
  ];
  expect(findSchoolClosedToday(today, calendar)).toBeNull();
});

test('findSchoolClosedToday matches closure announcements for today', () => {
  const announcements: Announcement[] = [
    {
      id: 'a1',
      title: 'School closed — maintenance',
      body: 'No classes',
      from: 'Admin',
      date: today,
      type: 'event',
      pinned: true,
    },
  ];
  expect(findSchoolClosedToday(today, [], announcements)?.title).toContain('closed');
});
