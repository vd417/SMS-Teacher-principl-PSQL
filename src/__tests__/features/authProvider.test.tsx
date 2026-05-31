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
  const { status } = useAuth();
  return <Text>{status}</Text>;
};

describe('AuthProvider', () => {
  it('boots to unauthenticated when no token stored', async () => {
    const store = await createStore();
    const repos = createMockRepositories(store);
    render(
      <RepositoryProvider repositories={repos}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </RepositoryProvider>
    );
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  });
});
