import type { AuthRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockAuth(store: Store): AuthRepository {
  return {
    async login(email) {
      await simulateLatency();
      if (!email) throw new AppError({ code: 'invalid', status: 400, message: 'Email required' });
      await store.setCurrentAccount(email);
      return store.session;
    },
    async refresh() {
      await simulateLatency();
      return store.session;
    },
    async me() {
      await simulateLatency();
      return store.session.user;
    },
    async logout() {
      await simulateLatency();
    },
  };
}
