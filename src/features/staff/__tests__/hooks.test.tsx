import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSchoolStaffDirectory } from '../hooks';

const mockStaffList = jest.fn();
const mockTeachersList = jest.fn();

jest.mock('@/data/repositories/RepositoryContext', () => ({
  useRepositories: () => ({
    staff: { list: mockStaffList },
    teachers: { list: mockTeachersList },
    principal: { overview: jest.fn() },
  }),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { role: 'teacher', name: 'Asha Kulkarni' } } }),
  useTenantId: () => 'tenant-1',
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockStaffList.mockReset();
  mockTeachersList.mockReset();
  mockTeachersList.mockResolvedValue([]);
  // GET /staff is school.principal-only (StaffController.cs) — always 403 for
  // a teacher. Reject like the real API so the query settles either way.
  mockStaffList.mockRejectedValue(new Error('403 Forbidden'));
});

test('A-9 (STF-01): a teacher never calls GET /staff, which always 403s for teachers (SD-1)', async () => {
  const { result } = renderHook(() => useSchoolStaffDirectory(), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(mockStaffList).not.toHaveBeenCalled();
});
