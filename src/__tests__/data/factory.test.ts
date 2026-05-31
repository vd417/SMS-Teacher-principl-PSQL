import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('factory', () => {
  it('builds a mock repositories bundle exposing auth', async () => {
    const store = await createStore();
    const repos = createMockRepositories(store);
    expect(typeof repos.auth.login).toBe('function');
  });
});
