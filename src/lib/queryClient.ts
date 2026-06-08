import { QueryClient } from '@tanstack/react-query';
import { isAppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (isAppError(error) && error.status === 401) return false;
        return count < 2;
      },
    },
  },
});

export const queryKeys = {
  classes: (tenantId: string) => ['classes', tenantId] as const,
  class: (tenantId: string, id: string) => ['classes', tenantId, id] as const,
  studentsByClass: (tenantId: string, classId: string) => ['students', tenantId, classId] as const,
  student: (tenantId: string, id: string) => ['student', tenantId, id] as const,
  attendance: (tenantId: string, classId: string, date: string) =>
    ['attendance', tenantId, classId, date] as const,
  timetable: (tenantId: string) => ['timetable', tenantId] as const,
  exams: (tenantId: string) => ['exams', tenantId] as const,
  exam: (tenantId: string, id: string) => ['exams', tenantId, id] as const,
  gradesByExam: (tenantId: string, examId: string) => ['grades', tenantId, examId] as const,
  assignments: (tenantId: string) => ['assignments', tenantId] as const,
  chatContacts: (tenantId: string) => ['chat', tenantId] as const,
  chatMessages: (tenantId: string, contactId: string) => ['chat', tenantId, contactId] as const,
  announcements: (tenantId: string) => ['announcements', tenantId] as const,
  calendar: (tenantId: string) => ['calendar', tenantId] as const,
  library: (tenantId: string) => ['library', tenantId] as const,
  payroll: (tenantId: string) => ['payroll', tenantId] as const,
  leave: (tenantId: string) => ['leave', tenantId] as const,
  approvals: (tenantId: string) => ['approvals', tenantId] as const,
  principalOverview: (tenantId: string) => ['principal', tenantId, 'overview'] as const,
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  bus: (tenantId: string) => ['bus', tenantId] as const,
  busPosition: (tenantId: string, busId: string) => ['bus', tenantId, busId, 'position'] as const,
  busRoster: (tenantId: string, busId: string) => ['bus', tenantId, busId, 'roster'] as const,
  schoolLocation: (tenantId: string) => ['myAttendance', tenantId, 'school'] as const,
  myAttendanceToday: (tenantId: string) => ['myAttendance', tenantId, 'today'] as const,
  myAttendanceHistory: (tenantId: string, limit: number) =>
    ['myAttendance', tenantId, 'history', limit] as const,
  myAttendanceSummary: (tenantId: string, month: string) =>
    ['myAttendance', tenantId, 'summary', month] as const,
  // Prefixes for invalidating every limit/month variant at once (react-query prefix match).
  myAttendanceHistoryPrefix: (tenantId: string) => ['myAttendance', tenantId, 'history'] as const,
  myAttendanceSummaryPrefix: (tenantId: string) => ['myAttendance', tenantId, 'summary'] as const,
};
