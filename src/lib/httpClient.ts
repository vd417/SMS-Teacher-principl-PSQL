import { AppError } from './errors';
import { runSingleFlight } from './refreshLock';
import { unwrapData, unwrapList, type Page } from './envelope';
import { addBreadcrumb } from './sentry';

export interface AuthSnapshot {
  accessToken: string | null;
  tenantId: string | null;
}
export interface HttpClientConfig {
  baseUrl: string;
  getAuth: () => AuthSnapshot;
  fetchImpl?: typeof fetch;
  // Called on a 401. Should refresh the access token (updating the auth snapshot
  // the client reads via getAuth) and resolve true on success, false on failure.
  // Kept here — not the refresh token — so the secret stays in the AuthProvider.
  onRefresh?: () => Promise<boolean>;
  // Called when a refresh fails; the app should sign the user out.
  onAuthLost?: () => void;
}
export interface RequestOptions {
  params?: Record<string, unknown>;
}

export interface HttpClient {
  get<T>(path: string, opts?: RequestOptions): Promise<T>;
  getList<T>(path: string, opts?: RequestOptions): Promise<Page<T>>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) usp.append(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const doFetch = config.fetchImpl ?? fetch;
  const isRefreshPath = (path: string) => path === '/auth/refresh';

  async function send(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions
  ): Promise<Response> {
    const { accessToken, tenantId } = config.getAuth();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    try {
      return await doFetch(`${config.baseUrl}${path}${toQuery(opts?.params)}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new AppError({ code: 'network', status: 0, message: (e as Error).message });
    }
  }

  async function toError(res: Response): Promise<AppError> {
    let code = `http_${res.status}`;
    let message = res.statusText || 'Request failed';
    let details: Record<string, string[]> | undefined;
    try {
      const j = await res.json();
      const err = j?.error;
      if (err?.code) code = err.code;
      if (err?.message) message = err.message;
      else if (j?.message) message = j.message;
      if (err?.details) details = err.details;
    } catch {
      /* non-JSON error body */
    }
    return new AppError({ code, status: res.status, message, details });
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions
  ): Promise<unknown> {
    let res = await send(method, path, body, opts);

    if (res.status === 401 && config.onRefresh && !isRefreshPath(path)) {
      const ok = await runSingleFlight(() => config.onRefresh!());
      if (!ok) {
        config.onAuthLost?.();
        const err = await toError(res);
        addBreadcrumb('http', { path, status: err.status, code: err.code });
        throw err;
      }
      res = await send(method, path, body, opts);
    }

    if (!res.ok) {
      const err = await toError(res);
      addBreadcrumb('http', { path, status: err.status, code: err.code });
      throw err;
    }
    if (res.status === 204) return undefined;
    return res.json();
  }

  // 204 / empty bodies (logout, attendance save, boarding, delete) have no envelope.
  const maybeData = (raw: unknown) => (raw === undefined ? undefined : unwrapData(raw));

  return {
    get: async (p, o) => maybeData(await request('GET', p, undefined, o)),
    getList: async (p, o) => {
      const { data, nextCursor } = unwrapList(await request('GET', p, undefined, o));
      return { items: data, nextCursor } as Page<unknown>;
    },
    post: async (p, b) => maybeData(await request('POST', p, b)),
    put: async (p, b) => maybeData(await request('PUT', p, b)),
    patch: async (p, b) => maybeData(await request('PATCH', p, b)),
    delete: async (p) => maybeData(await request('DELETE', p)),
  } as HttpClient;
}
