import type { ApprovalsRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockApprovals(store: Store): ApprovalsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.approvals];
    },

    async decide(id, decision, note) {
      await simulateLatency();
      const req = store.tables.approvals.find((a) => a.id === id);
      if (!req)
        throw new AppError({ code: 'not_found', status: 404, message: 'Request not found' });
      req.status = decision;
      if (note !== undefined) req.decidedNote = note;
      await store.persist('approvals');
      return { ...req };
    },
  };
}
