import type { AssignmentsRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAssignments(store: Store): AssignmentsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.assignments];
    },
  };
}
