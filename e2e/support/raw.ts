import { apiBaseUrl } from './config';
import type { Actor } from './session';

/** Raw call used where the test must see the HTTP status or the unparsed body (authorization and capture). */
export async function raw(
  actor: Actor | null,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers };
  if (actor) {
    headers.Authorization = `Bearer ${actor.auth.accessToken}`;
    headers['X-Tenant-Id'] ??= actor.auth.tenantId;
  }
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}
