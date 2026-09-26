import type { Session } from '@/data/domain';
import { createHttpRepositories } from '@/data/repositories/factory';
import type { Repositories } from '@/data/repositories/types';
import { authSnapshot } from '@/lib/authSnapshot';
import { createHttpClient, type HttpClient } from '@/lib/httpClient';
import { apiBaseUrl } from './config';

export interface Actor {
  session: Session;
  http: HttpClient;
  repos: Repositories;
  auth: { accessToken: string; tenantId: string };
}

/** auth.repo writes the module-level authSnapshot during login, so each actor then gets its own client bound to its
 *  own tokens (several users are signed in at once). NEVER call loginAs concurrently (no Promise.all): two in-flight
 *  logins would race on the shared snapshot and cross tokens. */
export async function loginAs(email: string, password: string): Promise<Actor> {
  const bootstrap = createHttpRepositories(
    createHttpClient({ baseUrl: apiBaseUrl(), getAuth: () => authSnapshot.get() })
  );
  try {
    return actorFor(await bootstrap.auth.login(email, password));
  } finally {
    authSnapshot.clear();
  }
}

export function actorFor(session: Session): Actor {
  const auth = { accessToken: session.accessToken, tenantId: session.tenant.id };
  const http = createHttpClient({ baseUrl: apiBaseUrl(), getAuth: () => auth });
  return { session, http, repos: createHttpRepositories(http), auth };
}
