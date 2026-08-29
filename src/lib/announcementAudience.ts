import type { Announcement, Role } from '@/data/domain';

const STAFF_AUDIENCES = new Set(['teachers', 'staff', 'everyone']);

/** Announcements targeted at parents/students only stay out of the staff apps. */
export function announcementVisibleToRole(announcement: Announcement, role: Role): boolean {
  const audience = announcement.audience?.trim().toLowerCase();
  if (!audience) return true;

  if (role === 'principal') {
    return audience !== 'parents' && audience !== 'students' && audience !== 'defaulters';
  }

  return STAFF_AUDIENCES.has(audience);
}

export function filterAnnouncementsForRole(
  announcements: Announcement[],
  role: Role
): Announcement[] {
  return announcements.filter((a) => announcementVisibleToRole(a, role));
}
