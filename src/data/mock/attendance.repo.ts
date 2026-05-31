import type { AttendanceRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAttendance(store: Store): AttendanceRepository {
  return {
    async forClass(classId, date) {
      await simulateLatency();
      const classStudents = store.tables.students.filter((s) => s.classId === classId);
      const studentIds = new Set(classStudents.map((s) => s.id));

      // Find existing records for this date
      const existing = store.tables.attendance.filter(
        (r) => studentIds.has(r.studentId) && r.date === date
      );

      if (existing.length > 0) {
        return existing.map((r) => ({ ...r }));
      }

      // No records yet — return default 'P' records for each student
      return classStudents.map((s) => ({ studentId: s.id, status: 'P' as const, date }));
    },

    async save(classId, date, records) {
      await simulateLatency();
      const classStudents = store.tables.students.filter((s) => s.classId === classId);
      const studentIds = new Set(classStudents.map((s) => s.id));

      // Remove existing records for those students on that date
      store.tables.attendance = store.tables.attendance.filter(
        (r) => !(studentIds.has(r.studentId) && r.date === date)
      );

      // Push new records
      for (const rec of records) {
        store.tables.attendance.push({ ...rec });
      }

      await store.persist('attendance');
    },
  };
}
