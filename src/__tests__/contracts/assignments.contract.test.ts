import { assignmentsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockAssignments } from '@/data/mock/assignments.repo';
import { httpAssignments } from '@/data/http/assignments.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { AssignmentDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: AssignmentDTO[] = [
  {
    id: 'a1',
    title: 'Algebra Practice Set',
    class_id: 'c1',
    class_name: 'Grade 9-A',
    subject: 'Mathematics',
    due_date: '2026-04-30',
    submissions_count: 28,
    total_students: 32,
    status: 'active',
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

assignmentsContract('mock', async () => mockAssignments(await createStore()));
assignmentsContract('http', async () =>
  httpAssignments(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
