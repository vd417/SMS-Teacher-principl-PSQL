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

test('EXM-04: create with a non-upcoming status sends a follow-up PATCH, because CreateExamPaperRequest has no status field', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      if (method === 'POST') {
        return {
          ok: true,
          status: 201,
          statusText: 'Created',
          // The real backend always creates as 'upcoming' — CreateExamPaperRequest
          // has no `status` field, so the app-sent status is silently dropped.
          json: async () => ({ data: { ...createdRow, status: 'upcoming' } }),
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: { ...createdRow, status: 'draft' } }),
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
    status: 'draft',
  });

  expect(calls.map((c) => c.method)).toEqual(['POST', 'PATCH']);
  const patch = calls[1];
  expect(patch.url).toContain('/exam-papers/paper-1');
  expect(patch.body).toEqual({ status: 'draft' });
  expect(saved.status).toBe('draft');
});

test('EXM-04: create with the default upcoming status does not send a follow-up PATCH', async () => {
  const calls: { method?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      calls.push({ method: init?.method ?? 'GET' });
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({ data: createdRow }),
      };
    }),
  });

  await httpExams(http).create({
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

  expect(calls.map((c) => c.method)).toEqual(['POST']);
});

test('A-3: create rolls back (DELETEs) the just-created paper when the follow-up PATCH fails, and rejects', async () => {
  const calls: { url: string; method?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      if (method === 'POST') {
        return {
          ok: true,
          status: 201,
          statusText: 'Created',
          json: async () => ({ data: { ...createdRow, status: 'upcoming' } }),
        };
      }
      if (method === 'PATCH') {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: { code: 'http_500', message: 'patch failed' } }),
        };
      }
      if (method === 'DELETE') {
        return { ok: true, status: 204, statusText: 'No Content', json: async () => undefined };
      }
      throw new Error(`unexpected method ${method}`);
    }),
  });

  await expect(
    httpExams(http).create({
      title: 'Unit test 2',
      classId: 'c1',
      subject: 'Music',
      date: '2026-08-27',
      time: '09:00',
      duration: 45,
      maxMarks: 20,
      topics: ['Rhythm'],
      status: 'draft',
    })
  ).rejects.toThrow();

  expect(calls.map((c) => c.method)).toEqual(['POST', 'PATCH', 'DELETE']);
  const del = calls.find((c) => c.method === 'DELETE');
  expect(del?.url).toContain('/exam-papers/paper-1');
});

test('A-3: create rejects with an error naming the orphaned paper id when both the PATCH and the rollback DELETE fail', async () => {
  const calls: { method?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      const method = init?.method ?? 'GET';
      calls.push({ method });
      if (method === 'POST') {
        return {
          ok: true,
          status: 201,
          statusText: 'Created',
          json: async () => ({ data: { ...createdRow, status: 'upcoming' } }),
        };
      }
      if (method === 'PATCH') {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: { code: 'http_500', message: 'patch failed' } }),
        };
      }
      if (method === 'DELETE') {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: { code: 'http_500', message: 'delete failed' } }),
        };
      }
      throw new Error(`unexpected method ${method}`);
    }),
  });

  await expect(
    httpExams(http).create({
      title: 'Unit test 2',
      classId: 'c1',
      subject: 'Music',
      date: '2026-08-27',
      time: '09:00',
      duration: 45,
      maxMarks: 20,
      topics: ['Rhythm'],
      status: 'draft',
    })
  ).rejects.toThrow(/paper-1/);

  expect(calls.map((c) => c.method)).toEqual(['POST', 'PATCH', 'DELETE']);
});

test('EXM-05: update never sends class_id, because UpdateExamPaperRequest has no class_id field', async () => {
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
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: createdRow }),
      };
    }),
  });

  await httpExams(http).update('paper-1', { classId: 'c2', subject: 'Music' });

  const patch = calls.find((c) => c.method === 'PATCH');
  expect(patch?.body).toEqual({ subject: 'Music' });
  expect((patch?.body as { class_id?: unknown }).class_id).toBeUndefined();
});
