/** Parse wire `attachment_urls` (JSON string or array) into image URLs. */
export function parseAttachmentUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    try {
      const parsed: unknown = JSON.parse(text);
      return parseAttachmentUrls(parsed);
    } catch {
      return [];
    }
  }
  return [];
}
