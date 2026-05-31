import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useExams, useCreateExam, useDeleteExam } from '@/features/exams/hooks';
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
// Zero latency so mutations complete without delays in tests
jest.mock('@/lib/latency', () => ({
  simulateLatency: () => Promise.resolve(),
  maybeFail: () => {},
}));
// No-op persist so tests don't leave async AsyncStorage writes that bleed across tests.
// Return deep copies of the fallback so shared seed references aren't mutated across tests.
// Persistence correctness is covered by src/__tests__/data/store.test.ts and repo unit tests.
jest.mock('@/lib/asyncStore', () => ({
  readJson: async (_key: string, fallback: unknown) => JSON.parse(JSON.stringify(fallback)),
  writeJson: async () => {},
}));

function makeWrapper(repos: ReturnType<typeof createMockRepositories>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <RepositoryProvider repositories={repos}>
          <AuthProvider>{children}</AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

it('useExams returns seeded exams', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);
  const Probe = () => {
    const { data, isLoading } = useExams();
    if (isLoading) return <Text>loading</Text>;
    return <Text>count:{data?.length ?? 0}</Text>;
  };
  render(<Probe />, { wrapper: makeWrapper(repos) });
  await waitFor(() => expect(screen.getByText('count:5')).toBeTruthy());
});

it('useCreateExam optimistically adds an exam and persists it', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);

  const Probe = () => {
    const { data } = useExams();
    const create = useCreateExam();
    return (
      <>
        <Text>count:{data?.length ?? 0}</Text>
        <TouchableOpacity
          testID="create-btn"
          onPress={() =>
            create.mutate({
              title: 'New Exam',
              classId: 'c1',
              date: '2026-07-01',
              time: '9:00 AM',
              duration: 60,
              maxMarks: 100,
              topics: [],
              status: 'upcoming',
            })
          }
        >
          <Text>create</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(<Probe />, { wrapper: makeWrapper(repos) });
  await waitFor(() => expect(screen.getByText('count:5')).toBeTruthy());

  fireEvent.press(screen.getByTestId('create-btn'));

  // After mutation settles, count should be 6 (confirmed by server refetch via onSettled)
  await waitFor(() => expect(screen.getByText('count:6')).toBeTruthy(), { timeout: 5000 });

  // Verify the in-memory store was mutated (mutation function ran and modified the store)
  expect(store.tables.exams.length).toBe(6);
  expect(store.tables.exams[0].title).toBe('New Exam');
});

it('useDeleteExam optimistically removes an exam', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);

  const Probe = () => {
    const { data } = useExams();
    const del = useDeleteExam();
    return (
      <>
        <Text>count:{data?.length ?? 0}</Text>
        <TouchableOpacity testID="delete-btn" onPress={() => del.mutate('e1')}>
          <Text>delete</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(<Probe />, { wrapper: makeWrapper(repos) });
  await waitFor(() => expect(screen.getByText('count:5')).toBeTruthy());

  fireEvent.press(screen.getByTestId('delete-btn'));

  await waitFor(() => expect(screen.getByText('count:4')).toBeTruthy());
});
