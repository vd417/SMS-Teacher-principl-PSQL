import type { AuthSnapshot } from './httpClient';

// A small mutable holder so the live httpClient can read the *current* access
// token and tenant id synchronously on every request. AuthProvider updates it
// whenever the session changes (sign in, rehydrate, sign out). This is what
// threads tenant context into every request and avoids any startup race.
let current: AuthSnapshot = { accessToken: null, tenantId: null };

export const authSnapshot = {
  get(): AuthSnapshot {
    return current;
  },
  set(next: AuthSnapshot): void {
    current = next;
  },
  clear(): void {
    current = { accessToken: null, tenantId: null };
  },
};
