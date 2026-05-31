import AsyncStorage from '@react-native-async-storage/async-storage';
import { readJson, writeJson } from '@/lib/asyncStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('asyncStore', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns fallback when key missing', async () => {
    expect(await readJson('missing', { a: 1 })).toEqual({ a: 1 });
  });
  it('round-trips a value', async () => {
    await writeJson('k', { hello: 'world' });
    expect(await readJson('k', null)).toEqual({ hello: 'world' });
  });
});
