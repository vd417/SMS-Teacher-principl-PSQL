import type { AnnouncementsRepository, NewAnnouncementInput } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAnnouncements(store: Store): AnnouncementsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.announcements];
    },

    async create(input: NewAnnouncementInput) {
      await simulateLatency();
      const today = new Date().toISOString().slice(0, 10);
      const announcement = {
        id: store.genId('an'),
        title: input.title,
        body: input.body,
        type: input.type,
        from: store.session.user.name,
        date: today,
      };
      store.tables.announcements.unshift(announcement);
      await store.persist('announcements');
      return announcement;
    },
  };
}
