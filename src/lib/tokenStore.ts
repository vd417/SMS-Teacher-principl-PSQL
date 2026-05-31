import * as SecureStore from 'expo-secure-store';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
const ACCESS = 'sd.accessToken';
const REFRESH = 'sd.refreshToken';

export const tokenStore = {
  async read(): Promise<Tokens | null> {
    const accessToken = await SecureStore.getItemAsync(ACCESS);
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },
  async save(t: Tokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS, t.accessToken);
    await SecureStore.setItemAsync(REFRESH, t.refreshToken);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
