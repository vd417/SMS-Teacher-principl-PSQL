import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

async function wrapper() {
  const repos = createMockRepositories(await createStore());
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

describe('approvals hooks', () => {
  it('useApprovals lists pending requests', async () => {
    const { result } = renderHook(() => useApprovals(), { wrapper: await wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
  });

  it('useDecideApproval resolves without throwing', async () => {
    const w = await wrapper();
    const list = renderHook(() => useApprovals(), { wrapper: w });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const firstId = list.result.current.data![0].id;
    const decide = renderHook(() => useDecideApproval(), { wrapper: w });
    await act(async () => {
      await decide.result.current.mutateAsync({ id: firstId, decision: 'approved' });
    });
    expect(decide.result.current.isError).toBe(false);
  });
});
