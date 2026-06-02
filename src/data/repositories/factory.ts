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
import { mockExams } from '@/data/mock/exams.repo';
import { httpExams } from '@/data/http/exams.repo';
import { mockGrades } from '@/data/mock/grades.repo';
import { httpGrades } from '@/data/http/grades.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import { mockChat } from '@/data/mock/chat.repo';
import { httpChat } from '@/data/http/chat.repo';
import { mockLeave } from '@/data/mock/leave.repo';
import { httpLeave } from '@/data/http/leave.repo';
import { mockBus } from '@/data/mock/bus.repo';
import { httpBus } from '@/data/http/bus.repo';
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';
import { httpMyAttendance } from '@/data/http/myAttendance.repo';

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    classes: mockClasses(store),
    students: mockStudents(store),
    attendance: mockAttendance(store),
    timetable: mockTimetable(store),
    exams: mockExams(store),
    grades: mockGrades(store),
    assignments: mockAssignments(store),
    chat: mockChat(store),
    announcements: mockAnnouncements(store),
    calendar: mockCalendar(store),
    library: mockLibrary(store),
    payroll: mockPayroll(store),
    leave: mockLeave(store),
    dashboard: mockDashboard(store),
    bus: mockBus(store),
    myAttendance: mockMyAttendance(store),
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    classes: httpClasses(http),
    students: httpStudents(http),
    attendance: httpAttendance(http),
    timetable: httpTimetable(http),
    exams: httpExams(http),
    grades: httpGrades(http),
    assignments: httpAssignments(http),
    chat: httpChat(http),
    announcements: httpAnnouncements(http),
    calendar: httpCalendar(http),
    library: httpLibrary(http),
    payroll: httpPayroll(http),
    leave: httpLeave(http),
    dashboard: httpDashboard(http),
    bus: httpBus(http),
    myAttendance: httpMyAttendance(http),
  };
}
