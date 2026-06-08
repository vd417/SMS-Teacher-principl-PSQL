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
    async attendance() {
      await simulateLatency();
      const { tables } = store;
      const classes = [...tables.classAttendance];
      const presentTotal = classes.reduce((sum, c) => sum + c.present, 0);
      const studentTotal = classes.reduce((sum, c) => sum + c.total, 0);
      const overallPct = studentTotal ? Math.round((presentTotal / studentTotal) * 100) : 0;
      return {
        date: new Date().toISOString().slice(0, 10),
        presentTotal,
        studentTotal,
        overallPct,
        classes,
        staff: [...tables.staff],
      };
    },
  };
}
