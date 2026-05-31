import type { DashboardRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockDashboard(store: Store): DashboardRepository {
  return {
    async stats() {
      await simulateLatency();
      const { tables } = store;
      return {
        totalStudents: tables.students.length,
        totalClasses: tables.classes.length,
        attendanceToday: 94,
        pendingAssignments: tables.assignments.filter(
          (a) => a.status === 'active' || a.status === 'due_soon'
        ).length,
        upcomingExams: tables.exams.filter((e) => e.status === 'upcoming').length,
      };
    },
  };
}
