import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthProvider';
import { authBridge } from '../authBridge';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import { AppError } from '@/lib/errors';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSecure: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockSecure[k] ?? null,
  setItemAsync: async (k: string, v: string) => {
    mockSecure[k] = v;
  },
  deleteItemAsync: async (k: string) => {
    delete mockSecure[k];
  },
}));

// Keep these auth tests focused on session logic, not the real persister/AsyncStorage.
jest.mock('@/lib/queryPersist', () => ({
  startCachePersistence: () => [Promise.resolve(), { stop: jest.fn() }],
  clearCachePersistence: jest.fn(async () => {}),
  cacheKeyFor: (t: string, u: string) => `${t}:${u}`,
}));

const STORED = {
  accessToken: 'stored-access',
  refreshToken: 'stored-refresh',
  user: {
    id: 'u1',
    name: 'Asha',
    initials: 'A',
    title: '',
    email: '',
    phone: '',
    employee: 'E1',
    classroom: '',
    joined: '',
    role: 'teacher' as const,
    mustSetPassword: false,
    photoUrl: null,
  },
  tenant: { id: 't1', name: 'School One', tier: 'silver' as const, planName: '', logoUrl: null },
};

async function seedSession(): Promise<void> {
  mockSecure['sd.accessToken'] = 'stored-access';
  mockSecure['sd.refreshToken'] = 'stored-refresh';
  await AsyncStorage.setItem('sd.session', JSON.stringify(STORED));
}

const Probe = () => {
  const { status, session } = useAuth();
  return (
    <>
      <Text>{`status:${status}`}</Text>
      <Text>{`tenant:${session?.tenant.id ?? 'none'}`}</Text>
      <Text>{`name:${session?.user.name ?? 'none'}`}</Text>
    </>
  );
};

function mount(repos: Repositories) {
  return render(
    <RepositoryProvider repositories={repos}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </RepositoryProvider>
  );
}

beforeEach(async () => {
  for (const k of Object.keys(mockSecure)) delete mockSecure[k];
  await AsyncStorage.clear();
});

test('cold start OFFLINE: stored session + network error keeps the user signed in', async () => {
  await seedSession();
  const me = jest.fn(async () => {
    throw new AppError({ code: 'network', status: 0, message: 'offline' });
  });
  const repos = { auth: { me, listMySchools: jest.fn(async () => []) } } as unknown as Repositories;

  mount(repos);

  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  await waitFor(() => expect(me).toHaveBeenCalled());
  // The network error must NOT log the user out.
  expect(screen.getByText('status:authenticated')).toBeTruthy();
  expect(screen.getByText('tenant:t1')).toBeTruthy();
});

test('cold start with 5xx keeps the user signed in on cached data', async () => {
  await seedSession();
  const me = jest.fn(async () => {
    throw new AppError({ code: 'http_503', status: 503, message: 'down' });
  });
  const repos = { auth: { me, listMySchools: jest.fn(async () => []) } } as unknown as Repositories;

  mount(repos);

  await waitFor(() => expect(me).toHaveBeenCalled());
  expect(screen.getByText('status:authenticated')).toBeTruthy();
  expect(screen.getByText('name:Asha')).toBeTruthy(); // cached name preserved
});

test('cold start ONLINE refreshes the session from me()', async () => {
  await seedSession();
  const me = jest.fn(async () => ({
    user: { ...STORED.user, name: 'Asha Fresh' },
    tenant: { id: 't1', name: 'School One', tier: 'gold' as const, planName: 'Pro' },
  }));
  const repos = { auth: { me, listMySchools: jest.fn(async () => []) } } as unknown as Repositories;

  mount(repos);

  await waitFor(() => expect(screen.getByText('name:Asha Fresh')).toBeTruthy());
  expect(screen.getByText('status:authenticated')).toBeTruthy();
});

test('cold start with a genuine auth failure (401) signs the user out', async () => {
  await seedSession();
  const me = jest.fn(async () => {
    throw new AppError({ code: 'unauthorized', status: 401, message: 'invalid' });
  });
  const repos = { auth: { me, listMySchools: jest.fn(async () => []) } } as unknown as Repositories;

  mount(repos);

  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
});

test('refresh THROWS on a network error (no sign-out) but returns false on a genuine 401', async () => {
  await seedSession();
  const refresh = jest.fn();
  const repos = {
    auth: {
      me: jest.fn(async () => ({ user: STORED.user, tenant: STORED.tenant })),
      listMySchools: jest.fn(async () => []),
      refresh,
    },
  } as unknown as Repositories;

  mount(repos);
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());

  // Network error while refreshing -> throw (transient), so httpClient does NOT sign out.
  refresh.mockImplementationOnce(async () => {
    throw new AppError({ code: 'network', status: 0, message: 'x' });
  });
  await expect(authBridge.refresh()).rejects.toBeTruthy();

  // Genuine rejection -> return false, which triggers sign-out in httpClient.
  refresh.mockImplementationOnce(async () => {
    throw new AppError({ code: 'invalid_grant', status: 401, message: 'x' });
  });
  await expect(authBridge.refresh()).resolves.toBe(false);
});
