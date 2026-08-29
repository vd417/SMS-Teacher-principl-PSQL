import type { Announcement, CalendarEvent } from '@/data/domain';

/** Calendar holiday or same-day closure announcement for the active school. */
export function findSchoolClosedToday(
  today: string,
  calendar: CalendarEvent[],
  announcements: Announcement[] = []
): { title: string; description?: string } | null {
  const holiday = calendar.find((e) => e.date === today && e.type === 'holiday');
  if (holiday) {
    return { title: holiday.title, description: holiday.description };
  }

  const closedAnn = announcements.find(
    (a) =>
      a.date === today &&
      (/\bclosed\b/i.test(a.title) ||
        /\bholiday\b/i.test(a.title) ||
        /\bno\s+school\b/i.test(a.title))
  );
  if (closedAnn) {
    return { title: closedAnn.title, description: closedAnn.body };
  }

  return null;
}
