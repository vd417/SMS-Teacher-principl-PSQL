import { libraryContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockLibrary } from '@/data/mock/library.repo';
import { httpLibrary } from '@/data/http/library.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { LibraryBookDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: LibraryBookDTO[] = [
  {
    id: 'lb1',
    title: 'Higher Mathematics',
    author: 'S. L. Loney',
    subject: 'Mathematics',
    status: 'available',
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

libraryContract('mock', async () => mockLibrary(await createStore()));
libraryContract('http', async () =>
  httpLibrary(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
