import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouteGeometry } from '../useRouteGeometry';
import * as routeGeometryRepoModule from '@/data/http/routeGeometry.repo';

jest.mock('@/features/auth/AuthProvider', () => ({
  useTenantId: () => 'tenant-1',
}));

jest.mock('@/lib/authSnapshot', () => ({
  authSnapshot: { get: () => ({ accessToken: 't', tenantId: 'tenant-1' }) },
}));

jest.mock('@/features/auth/authBridge', () => ({
  authBridge: { refresh: jest.fn(), signOut: jest.fn() },
}));

// `useRouteGeometry.ts` builds its `routeGeometryRepo` once at module-load time
// (`httpRouteGeometry(http)`), which runs as soon as this test file's hoisted `import` of
// `useRouteGeometry` executes — before any later top-level `const` in *this* file would be
// initialized. So the shared mock fn must be created *inside* the factory itself (captured by
// the returned object at the moment `httpRouteGeometry()` is first invoked) rather than
// referencing an outer `const mockGet` declared later in this file: with plain `import`
// hoisting, that outer binding would not be assigned yet when the factory runs, and the query
// would silently call a stale/undefined value.
jest.mock('@/data/http/routeGeometry.repo', () => {
  const get = jest.fn();
  return {
    httpRouteGeometry: () => ({ get }),
    __mockGet: get,
  };
});

const mockGet = (routeGeometryRepoModule as unknown as { __mockGet: jest.Mock }).__mockGet;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

afterEach(() => {
  mockGet.mockReset();
});

test('a resolved query keeps the real data', async () => {
  mockGet.mockResolvedValue({
    routeId: 'r1',
    status: 'available',
    format: 'google-encoded-polyline',
    geometry: 'abc',
    distanceMeters: 100,
    durationSeconds: 60,
    stopSequenceHash: 'sha256:h',
    generatedAt: '2026-09-19T10:00:00Z',
  });

  const { result } = renderHook(() => useRouteGeometry('r1'), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data?.status).toBe('available');
  expect(result.current.data?.geometry).toBe('abc');
});

test('an HTTP error (e.g. non-2xx / AppError) produces an effective unavailable-shaped data, not undefined', async () => {
  mockGet.mockRejectedValue(new Error('boom: 404 not found'));

  const { result } = renderHook(() => useRouteGeometry('bad-id'), { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(result.current.data).toBeDefined();
  expect(result.current.data).toEqual({
    routeId: 'bad-id',
    status: 'unavailable',
    format: null,
    geometry: null,
    distanceMeters: null,
    durationSeconds: null,
    stopSequenceHash: '',
    generatedAt: null,
  });
});

test('while genuinely still loading (no routeId), data stays undefined rather than being coerced to unavailable', () => {
  const { result } = renderHook(() => useRouteGeometry(undefined), { wrapper });

  expect(result.current.isError).toBe(false);
  expect(result.current.data).toBeUndefined();
});
