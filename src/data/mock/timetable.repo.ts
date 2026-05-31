import type { TimetableRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockTimetable(store: Store): TimetableRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.timetable];
    },
  };
}
