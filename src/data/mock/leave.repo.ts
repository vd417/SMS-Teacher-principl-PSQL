import type { LeaveRepository, NewLeaveInput } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockLeave(store: Store): LeaveRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.leave];
    },

    async create(input: NewLeaveInput) {
      await simulateLatency();
      const today = new Date().toISOString().slice(0, 10);
      const req = {
        id: store.genId('leave'),
        status: 'pending' as const,
        appliedOn: today,
        ...input,
      };
      store.tables.leave.unshift(req);
      await store.persist('leave');
      return req;
    },
  };
}
