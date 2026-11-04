import type { NotificationResponse } from 'expo-notifications';
import { navigationRef } from '@/navigation/navigationRef';

/**
 * Deep-links a tapped bus push to the BusScreen for this role. No-op until the navigator is ready.
 * Kept free of the auth/repository graph so it can be unit-tested without native modules.
 */
export function routeFromResponse(
  response: NotificationResponse | null,
  role: string | undefined
): void {
  if (!response || !navigationRef.isReady()) return;
  // Loosely typed to navigate into the nested tab > stack without reconstructing the full
  // param-list generics for a two-screens-deep target.
  const navigate = navigationRef.navigate as unknown as (name: string, params?: object) => void;
  if (role === 'principal') {
    navigate('Principal', { screen: 'PHome', params: { screen: 'BusScreen' } });
  } else {
    navigate('Main', { screen: 'Home', params: { screen: 'BusScreen' } });
  }
}
