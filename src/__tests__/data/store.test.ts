import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@/data/mock/store';
import { seed } from '@/data/mock/seed';

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
  it('does not mutate the shared seed constant when a table is written', async () => {
    const before = seed.exams.length;
    const store = await createStore();
    store.tables.exams.unshift({
      id: 'e_temp',
      title: 'Temp',
      classId: 'c1',
      className: 'Grade 9-A',
      subject: 'Mathematics',
      date: '2026-06-10',
      time: '9:00 AM',
      duration: 30,
      maxMarks: 20,
      topics: [],
      status: 'draft',
    });
    expect(seed.exams).toHaveLength(before);
    expect(seed.exams.find((e) => e.id === 'e_temp')).toBeUndefined();
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

describe('multi-account store', () => {
  beforeEach(() => AsyncStorage.clear());

  it('defaults to the teacher account', async () => {
    const store = await createStore();
    expect(store.session.user.role).toBe('teacher');
  });

  it('setCurrentAccount switches the active session by email', async () => {
    const store = await createStore();
    await store.setCurrentAccount('sunita.r@westbrook.edu');
    expect(store.session.user.role).toBe('principal');
    expect(store.session.user.email).toBe('sunita.r@westbrook.edu');
  });

  it('unknown email leaves the current account unchanged', async () => {
    const store = await createStore();
    await store.setCurrentAccount('nobody@example.com');
    expect(store.session.user.role).toBe('teacher');
  });
});
