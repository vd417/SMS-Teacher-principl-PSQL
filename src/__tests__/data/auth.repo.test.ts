import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

describe('mockAuth', () => {
  it('login returns a session with tokens, teacher user and tenant', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('aanya.k@westbrook.edu', 'whatever');
    expect(session.accessToken).toBeTruthy();
    expect(session.user.role).toBe('teacher');
    expect(session.tenant.id).toBeTruthy();
  });
  it('me returns the seeded user', async () => {
    const store = await createStore();
    expect((await mockAuth(store).me()).name).toBe('Aanya Krishnan');
  });
});

describe('mock auth account selection', () => {
  it('logging in with the principal email returns the principal session', async () => {
    const repo = mockAuth(await createStore());
    const session = await repo.login('sunita.r@westbrook.edu', 'x');
    expect(session.user.role).toBe('principal');
  });

  it('me() reflects the most recent login', async () => {
    const store = await createStore();
    const repo = mockAuth(store);
    await repo.login('sunita.r@westbrook.edu', 'x');
    expect((await repo.me()).role).toBe('principal');
  });

  it('logging in with the teacher email returns the teacher session', async () => {
    const repo = mockAuth(await createStore());
    const session = await repo.login('aanya.k@westbrook.edu', 'x');
    expect(session.user.role).toBe('teacher');
  });
});
