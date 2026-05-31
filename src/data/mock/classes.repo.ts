import type { ClassesRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockClasses(store: Store): ClassesRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.classes];
    },
    async get(id) {
      await simulateLatency();
      const found = store.tables.classes.find((c) => c.id === id);
      if (!found)
        throw new AppError({ code: 'not_found', status: 404, message: 'Class not found' });
      return found;
    },
  };
}
