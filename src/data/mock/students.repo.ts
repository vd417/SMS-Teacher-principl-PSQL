import type { StudentsRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockStudents(store: Store): StudentsRepository {
  return {
    async listByClass(classId) {
      await simulateLatency();
      return store.tables.students.filter((s) => s.classId === classId);
    },
    async get(id) {
      await simulateLatency();
      const found = store.tables.students.find((s) => s.id === id);
      if (!found)
        throw new AppError({ code: 'not_found', status: 404, message: 'Student not found' });
      return found;
    },
  };
}
