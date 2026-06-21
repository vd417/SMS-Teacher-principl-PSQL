import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
const ACCESS = 'sd.accessToken';
const REFRESH = 'sd.refreshToken';

// expo-secure-store is native-only; on web fall back to localStorage so the
// app boots and persists a session there too. Native keeps encrypted storage.
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* storage unavailable — degrade to in-memory only */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* noop */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  async read(): Promise<Tokens | null> {
    const accessToken = await getItem(ACCESS);
    const refreshToken = await getItem(REFRESH);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },
  async save(t: Tokens): Promise<void> {
    await setItem(ACCESS, t.accessToken);
    await setItem(REFRESH, t.refreshToken);
  },
  async clear(): Promise<void> {
    await removeItem(ACCESS);
    await removeItem(REFRESH);
  },
};
