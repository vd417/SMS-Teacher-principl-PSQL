import { createHttpClient } from '@/lib/httpClient';
import { httpExams } from '../exams.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

const createdRow = {
  id: 'paper-1',
  class_id: 'c1',
  name: 'Unit test 2',
  subject: 'Music',
  date: '2026-08-27',
  start_time: '09:00',
  duration_min: 45,
  max_marks: 20,
  topics: 'Rhythm',
  status: 'upcoming',
};

test('create POST sends a class test with class, subject, time — not a CRM exam term', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({ data: createdRow }),
      };
    }),
  });

  const saved = await httpExams(http).create({
    title: 'Unit test 2',
    classId: 'c1',
    subject: 'Music',
    date: '2026-08-27',
    time: '09:00',
    duration: 45,
    maxMarks: 20,
    topics: ['Rhythm'],
    status: 'upcoming',
  });

  const post = calls.find((c) => c.url.endsWith('/exam-papers') && c.method === 'POST');
  expect(post?.body).toEqual({
    name: 'Unit test 2',
    class_id: 'c1',
    subject: 'Music',
    date: '2026-08-27',
    start_time: '09:00',
    duration_min: 45,
    max_marks: 20,
    topics: 'Rhythm',
    status: 'upcoming',
  });
  expect((post?.body as { exam_id?: unknown }).exam_id).toBeUndefined();
  expect(saved.subject).toBe('Music');
  expect(saved.title).toBe('Unit test 2');
  expect(saved.examTermId).toBeUndefined();
});
