import type { PrincipalRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockPrincipal(store: Store): PrincipalRepository {
  return {
    async overview() {
      await simulateLatency();
      const { tables } = store;
      const staff = [...tables.staff];
      const staffPresent = staff.filter((s) => s.checkedIn).length;
      const pendingApprovals = tables.approvals.filter((a) => a.status === 'pending').length;
      return {
        kpis: {
          studentsPresentPct: 94,
          staffPresent,
          staffTotal: staff.length,
          pendingApprovals,
        },
        staff,
      };
    },
  };
}
