import type { Repositories } from '@/data/repositories/types';

export interface CaptureCtx {
  date: string;
  classAId: string;
  studentAId: string;
  paperAId: string;
  busId: string;
  staffPersonId: string;
  threadId: string | null;
  routeId: string | null;
}

export interface CaptureRow {
  id: string;
  path: (c: CaptureCtx) => string;
  /** Same call through the app's real repo (zod-parsed). Omitted for rows with no zod schema (TS cast only). */
  repo?: (r: Repositories, c: CaptureCtx) => Promise<unknown>;
}

// Every GET the app makes. IDs match the parity matrix. Writes are exercised by the e2e gate (Task 9+), not here.
export const ROWS: CaptureRow[] = [
  { id: 'AUTH-05', path: () => '/auth/me', repo: (r) => r.auth.me() },
  { id: 'AUTH-10', path: () => '/me/schools', repo: (r) => r.auth.listMySchools() },
  { id: 'CLS-01', path: () => '/classes', repo: (r) => r.classes.list() },
  {
    id: 'CLS-02',
    path: (c) => `/classes/${c.classAId}`,
    repo: (r, c) => r.classes.get(c.classAId),
  },
  {
    id: 'STU-01',
    path: (c) => `/classes/${c.classAId}/students`,
    repo: (r, c) => r.students.listByClass(c.classAId),
  },
  {
    id: 'STU-02',
    path: (c) => `/students/${c.studentAId}`,
    repo: (r, c) => r.students.get(c.studentAId),
  },
  {
    id: 'ATT-01',
    path: (c) => `/classes/${c.classAId}/attendance?date=${c.date}`,
    repo: (r, c) => r.attendance.forClass(c.classAId, c.date),
  },
  {
    id: 'ATT-02',
    path: (c) => `/classes/${c.classAId}/attendance/roll-call?date=${c.date}`,
    repo: (r, c) => r.attendance.rollCall(c.classAId, c.date),
  },
  {
    id: 'ATT-03',
    path: (c) => `/classes/${c.classAId}/timetable/day?date=${c.date}`,
    repo: (r, c) => r.attendance.dayTimetable(c.classAId, c.date),
  },
  {
    id: 'ATT-04',
    path: (c) =>
      `/classes/${c.classAId}/attendance/periods?date=${c.date}&period=1&subject=Mathematics`,
    repo: (r, c) => r.attendance.forPeriod(c.classAId, c.date, 1, 'Mathematics'),
  },
  { id: 'TT-01', path: () => '/timetable', repo: (r) => r.timetable.list() },
  { id: 'EXM-01', path: () => '/exams', repo: (r) => r.exams.listTerms() },
  { id: 'EXM-02', path: () => '/exam-papers', repo: (r) => r.exams.list() },
  {
    id: 'EXM-03',
    path: (c) => `/exam-papers/${c.paperAId}`,
    repo: (r, c) => r.exams.get(c.paperAId),
  },
  {
    id: 'GRD-01',
    path: (c) => `/exam-papers/${c.paperAId}/grades`,
    repo: (r, c) => r.grades.listByExam(c.paperAId),
  },
  { id: 'ASG-01', path: () => '/assignments', repo: (r) => r.assignments.list() },
  { id: 'CHT-01', path: () => '/threads', repo: (r) => r.chat.contacts() },
  {
    id: 'CHT-02',
    path: (c) => `/threads/${c.threadId ?? '00000000-0000-0000-0000-000000000000'}/messages`,
    repo: (r, c) => r.chat.messages(c.threadId ?? '00000000-0000-0000-0000-000000000000'),
  },
  { id: 'ANN-01', path: () => '/announcements', repo: (r) => r.announcements.list() },
  { id: 'NTF-01', path: () => '/notifications', repo: (r) => r.notifications.list() },
  { id: 'CAL-01', path: () => '/calendar', repo: (r) => r.calendar.list() },
  { id: 'LIB-01', path: () => '/library', repo: (r) => r.library.list() },
  { id: 'PAY-01', path: () => '/payslips', repo: (r) => r.payroll.list() },
  { id: 'LEV-01', path: () => '/leave', repo: (r) => r.leave.list() },
  {
    id: 'APR-01',
    path: () => '/approvals?status=pending',
    repo: (r) => r.approvals.list('pending'),
  },
  { id: 'DSH-01', path: () => '/dashboard/stats', repo: (r) => r.dashboard.stats() },
  { id: 'PRN-01', path: () => '/principal/overview', repo: (r) => r.principal.overview() },
  {
    id: 'PRN-02',
    path: (c) => `/principal/attendance?date=${c.date}`,
    repo: (r, c) => r.principal.attendance(c.date),
  },
  {
    id: 'PRN-03',
    path: (c) => `/principal/staff/${c.staffPersonId}/attendance/history`,
    repo: (r, c) => r.principal.staffAttendanceHistory(c.staffPersonId),
  },
  { id: 'PRN-04', path: () => '/transport/fleet', repo: (r) => r.principal.transportFleet() },
  { id: 'PRN-05', path: () => '/transport/buses', repo: (r) => r.principal.listTransportBuses() },
  {
    id: 'GEO-01',
    path: (c) =>
      `/transport/routes/${c.routeId ?? '00000000-0000-0000-0000-000000000000'}/geometry`,
  },
  { id: 'TCH-01', path: () => '/teachers?status=active', repo: (r) => r.teachers.list() },
  { id: 'STF-01', path: () => '/staff', repo: (r) => r.staff.list() },
  { id: 'BUS-01', path: () => '/bus/assigned', repo: (r) => r.bus.assignedBus() },
  {
    id: 'BUS-02',
    path: (c) => `/bus/${c.busId}/position`,
    repo: (r, c) => r.bus.position(c.busId),
  },
  { id: 'BUS-03', path: (c) => `/bus/${c.busId}/roster`, repo: (r, c) => r.bus.roster(c.busId) },
  { id: 'BUS-05', path: () => '/bus/traveling', repo: (r) => r.bus.myRoutes() },
  {
    id: 'MYA-01',
    path: () => '/me/attendance/school-location',
    repo: (r) => r.myAttendance.schoolLocation(),
  },
  {
    id: 'MYA-02',
    path: (c) => `/me/attendance/today?date=${c.date}`,
    repo: (r) => r.myAttendance.today(),
  },
  {
    id: 'MYA-03',
    path: () => '/me/attendance/history?limit=30',
    repo: (r) => r.myAttendance.history(30),
  },
  {
    id: 'MYA-04',
    path: (c) => `/me/attendance/summary?month=${c.date.slice(0, 7)}`,
    repo: (r, c) => r.myAttendance.summary(c.date.slice(0, 7)),
  },
];
