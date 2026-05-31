import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useLogin } from '@/features/auth/hooks';
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
  const login = useLogin();
  const { status } = useAuth();
  return (
    <>
      <Text>{status}</Text>
      <TouchableOpacity onPress={() => login.mutate({ email: 'a@b.c', password: 'x' })}>
        <Text>login</Text>
      </TouchableOpacity>
    </>
  );
};

it('useLogin authenticates', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={repos}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('login'));
  await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
});
