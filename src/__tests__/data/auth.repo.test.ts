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

describe('mock auth OTP', () => {
  it('requestOtp resolves for a known email and returns a masked email destination', async () => {
    const repo = mockAuth(await createStore());
    const challenge = await repo.requestOtp('aanya.k@westbrook.edu');
    expect(challenge.channel).toBe('email');
    expect(challenge.destination).toContain('@');
    expect(challenge.destination).toMatch(/^.••@/);
    expect(challenge.devCode).toBe('123456');
  });

  it('requestOtp resolves for a known phone in any format and masks the last 4 digits', async () => {
    const repo = mockAuth(await createStore());
    const challenge = await repo.requestOtp('14155550118');
    expect(challenge.channel).toBe('sms');
    expect(challenge.destination).toContain('0118');
    expect(challenge.destination).toMatch(/^••••/);
    expect(challenge.devCode).toBe('123456');
  });

  it('requestOtp rejects an empty identifier', async () => {
    const repo = mockAuth(await createStore());
    await expect(repo.requestOtp('   ')).rejects.toThrow('Enter a mobile number or email');
  });

  it('requestOtp rejects an unregistered identifier', async () => {
    const repo = mockAuth(await createStore());
    await expect(repo.requestOtp('nobody@nowhere.com')).rejects.toThrow(
      "This mobile or email isn't registered."
    );
  });

  it('verifyOtp accepts 123456 and returns the matching account session', async () => {
    const repo = mockAuth(await createStore());
    const session = await repo.verifyOtp('sunita.r@westbrook.edu', '123456');
    expect(session.user.role).toBe('principal');
  });

  it('verifyOtp rejects a wrong code', async () => {
    const repo = mockAuth(await createStore());
    await expect(repo.verifyOtp('aanya.k@westbrook.edu', '000000')).rejects.toThrow(
      'Invalid code. Try again.'
    );
  });
});
