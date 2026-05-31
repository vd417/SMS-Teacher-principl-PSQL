import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
