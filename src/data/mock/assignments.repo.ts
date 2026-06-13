import type { AssignmentsRepository, NewAssignmentInput } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAssignments(store: Store): AssignmentsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.assignments];
    },

    async create(input: NewAssignmentInput) {
      await simulateLatency();
      const cls = store.tables.classes.find((c) => c.id === input.classId);
      const className = cls ? `${cls.name}-${cls.section}` : input.classId;
      const subject = cls?.subject ?? '';
      const assignment = {
        id: store.genId('asgn'),
        title: input.title,
        classId: input.classId,
        className,
        subject,
        dueDate: input.dueDate,
        submissionsCount: 0,
        totalStudents: cls?.studentCount ?? 0,
        status: 'active' as const,
        description: input.description,
        imageUri: input.imageUri,
      };
      store.tables.assignments.unshift(assignment);
      await store.persist('assignments');
      return assignment;
    },
  };
}
