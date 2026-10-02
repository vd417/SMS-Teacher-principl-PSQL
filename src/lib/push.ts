import { Platform } from 'react-native';

/** The device platform for push registration, or null when push is unsupported (web). */
export function pushPlatform(): 'ios' | 'android' | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}
