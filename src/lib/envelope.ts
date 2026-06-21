// The backend wraps every response in an envelope:
//   single resource -> { data: T }
//   list            -> { data: T[], next_cursor: string | null }
//   error           -> { error: { code, message, details? } }   (handled in httpClient)
// These helpers strip the envelope so repositories work with plain payloads.

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data;
  throw new Error('expected an enveloped { data } response');
}

export function unwrapList(raw: unknown): { data: unknown[]; nextCursor: string | null } {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const r = raw as { data: unknown; next_cursor?: string | null };
    if (!Array.isArray(r.data)) throw new Error('expected list data to be an array');
    return { data: r.data, nextCursor: r.next_cursor ?? null };
  }
  throw new Error('expected an enveloped list response');
}
