import { classesContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockClasses } from '@/data/mock/classes.repo';
import { httpClasses } from '@/data/http/classes.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ClassDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Fixture-backed fetch so the http adapter runs without a real server.
const FIXTURE: ClassDTO[] = [
  {
    id: 'c1',
    name: 'Grade 9',
    section: 'A',
    subject: 'Mathematics',
    student_count: 32,
    room: 'Room 214',
  },
];
const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
  const isList = String(url).endsWith('/classes');
  const body = isList ? FIXTURE : FIXTURE[0];
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}) as unknown as typeof fetch;

classesContract('mock', async () => mockClasses(await createStore()));
classesContract('http', async () =>
  httpClasses(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
