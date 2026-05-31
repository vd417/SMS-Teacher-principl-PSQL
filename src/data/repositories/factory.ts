import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { httpAuth } from '@/data/http/auth.repo';
import { mockClasses } from '@/data/mock/classes.repo';
import { httpClasses } from '@/data/http/classes.repo';
import { mockStudents } from '@/data/mock/students.repo';
import { httpStudents } from '@/data/http/students.repo';
import { mockTimetable } from '@/data/mock/timetable.repo';
import { httpTimetable } from '@/data/http/timetable.repo';
import { mockAssignments } from '@/data/mock/assignments.repo';
import { httpAssignments } from '@/data/http/assignments.repo';
import { mockAnnouncements } from '@/data/mock/announcements.repo';
import { httpAnnouncements } from '@/data/http/announcements.repo';
import { mockCalendar } from '@/data/mock/calendar.repo';
import { httpCalendar } from '@/data/http/calendar.repo';
import { mockLibrary } from '@/data/mock/library.repo';
import { httpLibrary } from '@/data/http/library.repo';
import { mockPayroll } from '@/data/mock/payroll.repo';
import { httpPayroll } from '@/data/http/payroll.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';

const notImplemented = (name: string) =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(`Repository "${name}" not implemented yet`);
      },
    }
  );

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    classes: mockClasses(store),
    students: mockStudents(store),
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: mockTimetable(store),
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: mockAssignments(store),
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: mockAnnouncements(store),
    calendar: mockCalendar(store),
    library: mockLibrary(store),
    payroll: mockPayroll(store),
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: mockDashboard(store),
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    classes: httpClasses(http),
    students: httpStudents(http),
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: httpTimetable(http),
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: httpAssignments(http),
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: httpAnnouncements(http),
    calendar: httpCalendar(http),
    library: httpLibrary(http),
    payroll: httpPayroll(http),
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: httpDashboard(http),
  };
}
