import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useGradesByExam, useUpsertGrade } from '@/features/grades/hooks';
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
jest.mock('@/lib/latency', () => ({
  simulateLatency: () => Promise.resolve(),
  maybeFail: () => {},
}));
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

it('useGradesByExam returns grades for an exam', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);

  const Probe = () => {
    const { data, isLoading } = useGradesByExam('e3');
    if (isLoading) return <Text>loading</Text>;
    return <Text>count:{data?.length ?? 0}</Text>;
  };

  render(<Probe />, { wrapper: makeWrapper(repos) });
  await waitFor(() => expect(screen.getByText('count:7')).toBeTruthy());
});

it('useUpsertGrade updates existing grade optimistically', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);

  const Probe = () => {
    const { data } = useGradesByExam('e3');
    const upsert = useUpsertGrade('e3');
    const s1Grade = data?.find((g) => g.studentId === 's1');
    return (
      <>
        <Text>marks:{s1Grade?.marks ?? '-'}</Text>
        <TouchableOpacity
          testID="upsert-btn"
          onPress={() => upsert.mutate({ studentId: 's1', examId: 'e3', marks: 95 })}
        >
          <Text>upsert</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(<Probe />, { wrapper: makeWrapper(repos) });
  await waitFor(() => expect(screen.getByText('marks:88')).toBeTruthy());

  fireEvent.press(screen.getByTestId('upsert-btn'));

  await waitFor(() => expect(screen.getByText('marks:95')).toBeTruthy());
});
