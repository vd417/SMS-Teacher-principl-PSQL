import type { AnnouncementsRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAnnouncements(store: Store): AnnouncementsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.announcements];
    },
  };
}
