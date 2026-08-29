import type { Session } from '@/data/domain';

/** Web localStorage quota is ~5MB; never persist data URIs or huge strings. */
const MAX_PERSISTED_URL_LEN = 2048;

export function persistableMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (trimmed.length > MAX_PERSISTED_URL_LEN) return null;
  return trimmed;
}

/** Strip bulky media from the session blob written to AsyncStorage / localStorage. */
export function sessionForStorage(s: Session): Session {
  return {
    ...s,
    user: { ...s.user, photoUrl: null },
    tenant: {
      ...s.tenant,
      logoUrl: persistableMediaUrl(s.tenant.logoUrl),
    },
  };
}
