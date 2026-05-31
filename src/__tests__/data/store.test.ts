import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('mock store', () => {
  beforeEach(() => AsyncStorage.clear());

  it('hydrates from seed when storage empty', async () => {
    const store = await createStore();
    expect(store.tables.classes).toHaveLength(4);
  });
  it('persists table writes and reloads them', async () => {
    const store = await createStore();
    store.tables.exams.unshift({
      id: 'e_new',
      title: 'Pop Quiz',
      classId: 'c1',
      className: 'Grade 9-A',
      subject: 'Mathematics',
      date: '2026-06-10',
      time: '9:00 AM',
      duration: 30,
      maxMarks: 20,
      topics: ['Algebra'],
      status: 'draft',
    });
    await store.persist('exams');
    const reloaded = await createStore();
    expect(reloaded.tables.exams.find((e) => e.id === 'e_new')).toBeTruthy();
  });
  it('genId returns unique prefixed ids', () => {
    const store2Promise = createStore();
    return store2Promise.then((s) => {
      const a = s.genId('exam');
      const b = s.genId('exam');
      expect(a).not.toBe(b);
      expect(a.startsWith('exam_')).toBe(true);
    });
  });
});
