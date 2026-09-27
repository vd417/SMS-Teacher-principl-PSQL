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

/** switchSchool's internal confirmation call (`auth.repo.ts`'s `sessionFromTokens`) re-reads
 *  the *current* auth off whatever client it was built with, exactly like the app's own single
 *  long-lived client (`getAuth: () => authSnapshot.get()`, wired once in AuthProvider) — never an
 *  actor's own frozen client (`actorFor`'s `getAuth: () => auth` never changes). Route the switch
 *  through a bootstrap client bound to the shared snapshot, the same way loginAs does for login, so
 *  the confirmation request actually carries the just-switched token. NEVER call this concurrently
 *  with another loginAs/switchSchoolAs (no Promise.all): both write the same shared snapshot. */
export async function switchSchoolAs(actor: Actor, tenantId: string): Promise<Actor> {
  authSnapshot.set({ accessToken: actor.auth.accessToken, tenantId: actor.auth.tenantId });
  const bootstrap = createHttpRepositories(
    createHttpClient({ baseUrl: apiBaseUrl(), getAuth: () => authSnapshot.get() })
  );
  try {
    return actorFor(await bootstrap.auth.switchSchool(tenantId));
  } finally {
    authSnapshot.clear();
  }
}
