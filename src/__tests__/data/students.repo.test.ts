import { createStore } from '@/data/mock/store';
import { mockStudents } from '@/data/mock/students.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('mockStudents', () => {
  it('listByClass returns 10 students for c1', async () => {
    const store = await createStore();
    expect(await mockStudents(store).listByClass('c1')).toHaveLength(10);
  });
  it('get returns correct student by id', async () => {
    const store = await createStore();
    expect((await mockStudents(store).get('s1')).name).toBe('Aarav Sharma');
  });
});
