import { tokenStore } from '@/lib/tokenStore';

const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mem[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mem[k] = v;
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete mem[k];
  }),
}));

describe('tokenStore', () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
  });

  it('saves and reads tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    expect(await tokenStore.read()).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });
  it('clears tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    await tokenStore.clear();
    expect(await tokenStore.read()).toBeNull();
  });
});
