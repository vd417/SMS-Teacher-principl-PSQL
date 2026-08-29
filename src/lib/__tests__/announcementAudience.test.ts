import { filterAnnouncementsForRole } from '../announcementAudience';
import type { Announcement } from '@/data/domain';

const base = (audience: string): Announcement => ({
  id: audience,
  title: audience,
  body: '',
  date: '2026-07-01',
  from: 'Admin',
  type: 'info',
  audience,
});

test('filterAnnouncementsForRole keeps staff-facing audiences for teachers', () => {
  const rows = [base('teachers'), base('everyone'), base('parents'), base('students')];
  const visible = filterAnnouncementsForRole(rows, 'teacher');
  expect(visible.map((a) => a.audience)).toEqual(['teachers', 'everyone']);
});

test('filterAnnouncementsForRole shows broader set for principals', () => {
  const rows = [base('staff'), base('parents'), base('grades')];
  const visible = filterAnnouncementsForRole(rows, 'principal');
  expect(visible.map((a) => a.audience)).toEqual(['staff', 'grades']);
});
