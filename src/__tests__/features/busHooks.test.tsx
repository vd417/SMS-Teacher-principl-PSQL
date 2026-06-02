import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAssignedBus } from '@/features/bus/hooks';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

const Probe = () => {
  const { data, isLoading } = useAssignedBus();
  if (isLoading) return <Text>loading</Text>;
  return <Text>bus:{data?.number ?? 'none'}</Text>;
};

it('useAssignedBus returns the seeded bus', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('bus:WBA-07')).toBeTruthy());
});
