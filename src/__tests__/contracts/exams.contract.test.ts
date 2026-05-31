import { examsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockExams } from '@/data/mock/exams.repo';
import { httpExams } from '@/data/http/exams.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ExamDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: ExamDTO[] = [
  {
    id: 'e1',
    title: 'Mid-Term Mathematics',
    class_id: 'c1',
    class_name: 'Grade 9-A',
    subject: 'Mathematics',
    date: '2026-05-10',
    time: '9:00 AM',
    duration: 120,
    max_marks: 100,
    topics: ['Algebra', 'Geometry'],
    status: 'upcoming',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const created: ExamDTO = {
      id: 'e_new',
      title: body.title,
      class_id: body.class_id,
      class_name: 'Grade 9-A',
      subject: 'Mathematics',
      date: body.date,
      time: body.time,
      duration: body.duration,
      max_marks: body.max_marks,
      topics: body.topics ?? [],
      status: body.status ?? 'upcoming',
    };
    return {
      ok: true,
      status: 201,
      json: async () => created,
      text: async () => JSON.stringify(created),
    } as Response;
  }

  const isSingle = /\/exams\/[^/]+$/.test(urlStr);
  const body = isSingle ? FIXTURE[0] : FIXTURE;
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}) as unknown as typeof fetch;

examsContract('mock', async () => mockExams(await createStore()));
examsContract('http', async () =>
  httpExams(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
