import type { CalendarRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockCalendar(store: Store): CalendarRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.calendar];
    },
  };
}
