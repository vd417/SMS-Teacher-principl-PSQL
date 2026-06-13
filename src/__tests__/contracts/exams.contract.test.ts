import { examsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockExams } from '@/data/mock/exams.repo';
import { httpExams } from '@/data/http/exams.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ExamPaperDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: ExamPaperDTO[] = [
  {
    id: 'e1',
    exam_id: 'exam1',
    name: 'Mid-Term Mathematics',
    class_id: 'c1',
    class_name: 'Grade 9-A',
    subject: 'Mathematics',
    date: '2026-05-10',
    start_time: '9:00 AM',
    duration_min: 120,
    max_marks: 100,
    room: 'R-101',
    invigilator1: 'T. Rao',
    invigilator2: 'S. Khan',
    topics: ['Algebra', 'Geometry'],
    status: 'upcoming',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const created: ExamPaperDTO = {
      id: 'e_new',
      exam_id: 'exam1',
      name: body.name,
      class_id: body.class_id,
      class_name: 'Grade 9-A',
      subject: 'Mathematics',
      date: body.date,
      start_time: body.start_time,
      duration_min: body.duration_min,
      max_marks: body.max_marks,
      room: 'R-101',
      invigilator1: 'T. Rao',
      invigilator2: 'S. Khan',
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

  const isSingle = /\/exam-papers\/[^/]+$/.test(urlStr);
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
