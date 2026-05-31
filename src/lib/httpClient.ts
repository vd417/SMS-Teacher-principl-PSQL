import { AppError } from './errors';

export interface AuthSnapshot {
  accessToken: string | null;
  tenantId: string | null;
}
export interface HttpClientConfig {
  baseUrl: string;
  getAuth: () => AuthSnapshot;
  fetchImpl?: typeof fetch;
}
export interface RequestOptions {
  params?: Record<string, unknown>;
}

export interface HttpClient {
  get<T>(path: string, opts?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
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

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions
  ): Promise<T> {
    const { accessToken, tenantId } = config.getAuth();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    let res: Response;
    try {
      res = await doFetch(`${config.baseUrl}${path}${toQuery(opts?.params)}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new AppError({ code: 'network', status: 0, message: (e as Error).message });
    }

    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      try {
        const j = await res.json();
        if (j?.message) message = j.message;
      } catch {
        /* noop */
      }
      throw new AppError({ code: `http_${res.status}`, status: res.status, message });
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    get: (p, o) => request('GET', p, undefined, o),
    post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b),
    delete: (p) => request('DELETE', p),
  };
}
