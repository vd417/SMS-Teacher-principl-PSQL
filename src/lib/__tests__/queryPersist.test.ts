import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientSave,
  persistQueryClientRestore,
} from '@tanstack/query-persist-client-core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheKeyFor, clearCachePersistence, CACHE_VERSION } from '../queryPersist';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const persisterFor = (t: string, u: string) =>
  createAsyncStoragePersister({ storage: AsyncStorage, key: cacheKeyFor(t, u), throttleTime: 0 });

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('cacheKeyFor is stable per identity and distinct across identities', () => {
  expect(cacheKeyFor('t', 'u')).toBe(cacheKeyFor('t', 'u'));
  expect(cacheKeyFor('t1', 'u')).not.toBe(cacheKeyFor('t2', 'u'));
  expect(cacheKeyFor('t', 'u1')).not.toBe(cacheKeyFor('t', 'u2'));
});

test('a persisted cache never hydrates into a different tenant/user', async () => {
  const qcA = new QueryClient();
  qcA.setQueryData(['students', 'tenantA'], [{ id: 'a1' }]);
  await persistQueryClientSave({
    queryClient: qcA,
    persister: persisterFor('tenantA', 'userA'),
    buster: CACHE_VERSION,
  });

  // Different tenant + user restores: must see nothing from A.
  const qcB = new QueryClient();
  await persistQueryClientRestore({
    queryClient: qcB,
    persister: persisterFor('tenantB', 'userB'),
    buster: CACHE_VERSION,
  });
  expect(qcB.getQueryData(['students', 'tenantA'])).toBeUndefined();

  // Same identity restores: sees its own data.
  const qcA2 = new QueryClient();
  await persistQueryClientRestore({
    queryClient: qcA2,
    persister: persisterFor('tenantA', 'userA'),
    buster: CACHE_VERSION,
  });
  expect(qcA2.getQueryData(['students', 'tenantA'])).toEqual([{ id: 'a1' }]);
});

test('a different user in the SAME tenant does not inherit the cache', async () => {
  const qc1 = new QueryClient();
  qc1.setQueryData(['dashboard', 'tenantX'], { count: 42 });
  await persistQueryClientSave({
    queryClient: qc1,
    persister: persisterFor('tenantX', 'user1'),
    buster: CACHE_VERSION,
  });

  const qc2 = new QueryClient();
  await persistQueryClientRestore({
    queryClient: qc2,
    persister: persisterFor('tenantX', 'user2'),
    buster: CACHE_VERSION,
  });
  expect(qc2.getQueryData(['dashboard', 'tenantX'])).toBeUndefined();
});

test('a stale buster (version bump) discards the persisted cache', async () => {
  const qc = new QueryClient();
  qc.setQueryData(['x', 't'], 1);
  await persistQueryClientSave({
    queryClient: qc,
    persister: persisterFor('t', 'u'),
    buster: 'old-version',
  });

  const qc2 = new QueryClient();
  await persistQueryClientRestore({
    queryClient: qc2,
    persister: persisterFor('t', 'u'),
    buster: CACHE_VERSION, // different from what was saved
  });
  expect(qc2.getQueryData(['x', 't'])).toBeUndefined();
});

test('clearCachePersistence removes a stored identity cache', async () => {
  const qc = new QueryClient();
  qc.setQueryData(['x', 't'], 1);
  await persistQueryClientSave({
    queryClient: qc,
    persister: persisterFor('t', 'u'),
    buster: CACHE_VERSION,
  });

  await clearCachePersistence({ tenantId: 't', userId: 'u' });

  const qc2 = new QueryClient();
  await persistQueryClientRestore({
    queryClient: qc2,
    persister: persisterFor('t', 'u'),
    buster: CACHE_VERSION,
  });
  expect(qc2.getQueryData(['x', 't'])).toBeUndefined();
});
