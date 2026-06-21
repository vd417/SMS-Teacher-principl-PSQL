import type { Repositories } from './types';
import type { HttpClient } from '@/lib/httpClient';
import { httpAuth } from '@/data/http/auth.repo';
import { httpClasses } from '@/data/http/classes.repo';
import { httpStudents } from '@/data/http/students.repo';
import { httpTimetable } from '@/data/http/timetable.repo';
import { httpAssignments } from '@/data/http/assignments.repo';
import { httpAnnouncements } from '@/data/http/announcements.repo';
import { httpCalendar } from '@/data/http/calendar.repo';
import { httpLibrary } from '@/data/http/library.repo';
import { httpPayroll } from '@/data/http/payroll.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpExams } from '@/data/http/exams.repo';
import { httpGrades } from '@/data/http/grades.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import { httpChat } from '@/data/http/chat.repo';
import { httpLeave } from '@/data/http/leave.repo';
import { httpBus } from '@/data/http/bus.repo';
import { httpMyAttendance } from '@/data/http/myAttendance.repo';
import { httpApprovals } from '@/data/http/approvals.repo';
import { httpPrincipal } from '@/data/http/principal.repo';

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
    approvals: httpApprovals(http),
    dashboard: httpDashboard(http),
    principal: httpPrincipal(http),
    bus: httpBus(http),
    myAttendance: httpMyAttendance(http),
  };
}
