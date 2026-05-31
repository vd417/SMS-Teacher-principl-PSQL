import { studentsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockStudents } from '@/data/mock/students.repo';
import { httpStudents } from '@/data/http/students.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { StudentDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Fixture-backed fetch so the http adapter runs without a real server.
const FIXTURE: StudentDTO[] = [
  {
    id: 's1',
    name: 'Aarav Sharma',
    roll: '01',
    initials: 'AS',
    class_id: 'c1',
    attendance: 96,
    grade: 'A',
    parent: 'Rajesh Sharma',
    parent_phone: '+1 555-0101',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
  const urlStr = String(url);
  const isList = urlStr.includes('/classes/') && urlStr.endsWith('/students');
  const body = isList ? FIXTURE : FIXTURE[0];
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}) as unknown as typeof fetch;

studentsContract('mock', 'c1', async () => mockStudents(await createStore()));
studentsContract('http', 'c1', async () =>
  httpStudents(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
