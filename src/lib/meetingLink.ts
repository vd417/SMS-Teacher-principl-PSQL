import { Linking, Platform } from 'react-native';

/** Turn a pasted Meet, Zoom, or other link into an absolute URL. */
export function meetingUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${value}`;
    }
    return null;
  }
  if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value)) return `https://${value}`;
  return null;
}

/**
 * Open a meeting link. A full Meet or Zoom URL opens in a new tab on the web,
 * and in the existing tab when a popup is blocked. The phone opens it in the browser.
 */
export async function openMeetingLink(raw: string): Promise<boolean> {
  const url = meetingUrl(raw);
  if (!url) return false;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) return true;
    window.location.assign(url);
    return true;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
