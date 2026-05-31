import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mem[k] ?? null,
  setItemAsync: async (k: string, v: string) => {
    mem[k] = v;
  },
  deleteItemAsync: async (k: string) => {
    delete mem[k];
  },
}));

const Probe = () => {
  const { status, session, signIn } = useAuth();
  React.useEffect(() => {
    if (status === 'unauthenticated') void signIn('aanya.k@westbrook.edu', 'pw');
  }, [status, signIn]);
  return <Text>{`${status}:${session?.tenant.id ?? 'none'}`}</Text>;
};

const StatusOnly = () => {
  const { status, session } = useAuth();
  return <Text>{`${status}:${session?.tenant.id ?? 'none'}`}</Text>;
};

describe('AuthProvider', () => {
  it('boots to unauthenticated when no token stored', async () => {
    for (const k of Object.keys(mem)) delete mem[k];
    const store = await createStore();
    const repos = createMockRepositories(store);
    render(
      <RepositoryProvider repositories={repos}>
        <AuthProvider>
          <StatusOnly />
        </AuthProvider>
      </RepositoryProvider>
    );
    await waitFor(() => expect(screen.getByText('unauthenticated:none')).toBeTruthy());
  });

  it('rehydrates the full session (incl. tenant) across a remount', async () => {
    for (const k of Object.keys(mem)) delete mem[k];
    const store = await createStore();
    const repos = createMockRepositories(store);

    // First mount: sign in, which persists tokens + session.
    const first = render(
      <RepositoryProvider repositories={repos}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </RepositoryProvider>
    );
    await waitFor(() => expect(screen.getByText('authenticated:school_westbrook')).toBeTruthy());
    first.unmount();

    // Second mount (simulated app restart): session is rehydrated from storage.
    render(
      <RepositoryProvider repositories={repos}>
        <AuthProvider>
          <StatusOnly />
        </AuthProvider>
      </RepositoryProvider>
    );
    await waitFor(() => expect(screen.getByText('authenticated:school_westbrook')).toBeTruthy());
  });
});
