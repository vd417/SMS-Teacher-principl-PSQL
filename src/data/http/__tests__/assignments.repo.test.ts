import { createHttpClient } from '@/lib/httpClient';
import { httpAssignments } from '../assignments.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

const createdRow = {
  id: 'asgn-1',
  title: 'Algebra Set',
  class_id: 'c1',
  class_name: 'IV-B',
  subject: 'Music',
  period: 8,
  due_date: '2026-08-27',
  submissions_count: 0,
  total_students: 0,
  status: 'active',
  description: 'Practice page 12',
  image_uri: 'data:image/jpeg;base64,abc',
};

test('create POST shares homework with class, subject, period, and image', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      if (url.includes('/classes/c1/students')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ data: [], next_cursor: null }),
        };
      }
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({ data: createdRow }),
      };
    }),
  });

  const saved = await httpAssignments(http).create({
    title: 'Algebra Set',
    classId: 'c1',
    className: 'IV-B',
    subject: 'Music',
    period: 8,
    dueDate: '2026-08-27',
    description: 'Practice page 12',
    imageUri: 'data:image/jpeg;base64,abc',
  });

  const post = calls.find((c) => c.url.endsWith('/assignments') && c.method === 'POST');
  expect(post?.body).toEqual({
    title: 'Algebra Set',
    class_id: 'c1',
    class_name: 'IV-B',
    subject: 'Music',
    period: 8,
    due_date: '2026-08-27',
    description: 'Practice page 12',
    image_uri: 'data:image/jpeg;base64,abc',
  });
  expect(saved.imageUri).toBe('data:image/jpeg;base64,abc');
  expect(saved.subject).toBe('Music');
  expect(saved.period).toBe(8);
});

test('update PATCH keeps the homework image in the database payload', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { ...createdRow, title: 'Algebra Set 2', image_uri: 'data:image/png;base64,xyz' },
        }),
      };
    }),
  });

  const saved = await httpAssignments(http).update('asgn-1', {
    title: 'Algebra Set 2',
    classId: 'c1',
    className: 'IV-B',
    subject: 'Music',
    period: 8,
    dueDate: '2026-08-27',
    imageUri: 'data:image/png;base64,xyz',
  });

  expect(calls[0].url).toBe('https://api.test/v1/assignments/asgn-1');
  expect(calls[0].body).toMatchObject({
    title: 'Algebra Set 2',
    image_uri: 'data:image/png;base64,xyz',
    subject: 'Music',
    period: 8,
  });
  expect(saved.imageUri).toBe('data:image/png;base64,xyz');
});
