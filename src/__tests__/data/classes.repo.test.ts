import { createStore } from '@/data/mock/store';
import { mockClasses } from '@/data/mock/classes.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('mockClasses', () => {
  it('list returns all seeded classes', async () => {
    const store = await createStore();
    expect(await mockClasses(store).list()).toHaveLength(4);
  });
  it('get returns one by id', async () => {
    const store = await createStore();
    expect((await mockClasses(store).get('c1')).name).toBe('Grade 9');
  });
});
