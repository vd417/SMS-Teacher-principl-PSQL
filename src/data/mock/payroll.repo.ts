import type { PayrollRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockPayroll(store: Store): PayrollRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.payslips];
    },
  };
}
