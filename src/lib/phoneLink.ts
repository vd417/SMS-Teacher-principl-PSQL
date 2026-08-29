import { Linking, Platform } from 'react-native';

/** Strip spaces/dashes; keep leading + for country code. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Open the device phone dialer with the number.
 * On web, falls back to a Google search when tel: is not supported.
 */
export async function dialPhoneNumber(phone: string): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) return;

  const telUri = `tel:${normalizePhone(trimmed)}`;

  if (Platform.OS !== 'web') {
    await Linking.openURL(telUri);
    return;
  }

  try {
    const supported = await Linking.canOpenURL(telUri);
    if (supported) {
      await Linking.openURL(telUri);
      return;
    }
  } catch {
    // Google search fallback below
  }

  const query = encodeURIComponent(trimmed);
  if (typeof window !== 'undefined') {
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  }
}
