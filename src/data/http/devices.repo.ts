import type { DevicesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';

/** Idempotent upsert of this device's Expo push token for the signed-in teacher (POST /me/devices). */
export function httpDevices(http: HttpClient): DevicesRepository {
  return {
    register: ({ expoPushToken, platform }) =>
      http.post('/me/devices', { expo_push_token: expoPushToken, platform }).then(() => undefined),
  };
}
