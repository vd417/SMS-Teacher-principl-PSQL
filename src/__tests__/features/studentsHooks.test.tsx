import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useStudentsByClass, useStudent } from '@/features/students/hooks';
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

const Wrapper: React.FC<{
  children: React.ReactNode;
  repos: ReturnType<typeof createMockRepositories>;
}> = ({ children, repos }) => (
  <QueryClientProvider client={new QueryClient()}>
    <RepositoryProvider repositories={repos}>
      <AuthProvider>{children}</AuthProvider>
    </RepositoryProvider>
  </QueryClientProvider>
);

const ProbeList = () => {
  const { data, isLoading } = useStudentsByClass('c1');
  if (isLoading) return <Text>loading</Text>;
  return <Text>count:{data?.length ?? 0}</Text>;
};

const ProbeGet = () => {
  const { data, isLoading } = useStudent('s1');
  if (isLoading) return <Text>loading</Text>;
  return <Text>{data?.name ?? 'none'}</Text>;
};

it('useStudentsByClass returns students for class', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);
  render(
    <Wrapper repos={repos}>
      <ProbeList />
    </Wrapper>
  );
  await waitFor(() => expect(screen.getByText('count:10')).toBeTruthy());
});

it('useStudent returns the correct student', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);
  render(
    <Wrapper repos={repos}>
      <ProbeGet />
    </Wrapper>
  );
  await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());
});
