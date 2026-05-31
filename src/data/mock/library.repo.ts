import type { LibraryRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockLibrary(store: Store): LibraryRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.library];
    },
  };
}
