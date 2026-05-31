import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { httpAuth } from '@/data/http/auth.repo';
import { mockClasses } from '@/data/mock/classes.repo';
import { httpClasses } from '@/data/http/classes.repo';
import { mockStudents } from '@/data/mock/students.repo';
import { httpStudents } from '@/data/http/students.repo';

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
    // domains below are filled in by their tasks; until then they throw on use:
    classes: mockClasses(store),
    students: mockStudents(store),
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: notImplemented('timetable') as Repositories['timetable'],
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: notImplemented('assignments') as Repositories['assignments'],
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: notImplemented('announcements') as Repositories['announcements'],
    calendar: notImplemented('calendar') as Repositories['calendar'],
    library: notImplemented('library') as Repositories['library'],
    payroll: notImplemented('payroll') as Repositories['payroll'],
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: notImplemented('dashboard') as Repositories['dashboard'],
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    classes: httpClasses(http),
    students: httpStudents(http),
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: notImplemented('timetable') as Repositories['timetable'],
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: notImplemented('assignments') as Repositories['assignments'],
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: notImplemented('announcements') as Repositories['announcements'],
    calendar: notImplemented('calendar') as Repositories['calendar'],
    library: notImplemented('library') as Repositories['library'],
    payroll: notImplemented('payroll') as Repositories['payroll'],
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: notImplemented('dashboard') as Repositories['dashboard'],
  };
}
