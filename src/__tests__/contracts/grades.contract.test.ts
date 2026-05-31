import { gradesContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockGrades } from '@/data/mock/grades.repo';
import { httpGrades } from '@/data/http/grades.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { GradeDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const EXAM_ID = 'e3';

const FIXTURE: GradeDTO[] = [
  {
    student_id: 's1',
    student_name: 'Aarav Sharma',
    exam_id: EXAM_ID,
    marks: 88,
    max_marks: 100,
    grade: 'A',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'PUT') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const upserted: GradeDTO = {
      student_id: body.student_id,
      student_name: 'Test Student',
      exam_id: body.exam_id,
      marks: body.marks,
      max_marks: 100,
      grade: 'A',
    };
    return {
      ok: true,
      status: 200,
      json: async () => upserted,
      text: async () => JSON.stringify(upserted),
    } as Response;
  }

  return {
    ok: true,
    status: 200,
    json: async () => FIXTURE,
    text: async () => JSON.stringify(FIXTURE),
  } as Response;
}) as unknown as typeof fetch;

gradesContract('mock', EXAM_ID, async () => mockGrades(await createStore()));
gradesContract('http', EXAM_ID, async () =>
  httpGrades(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
