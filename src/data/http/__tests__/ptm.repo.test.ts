import { createHttpClient } from '@/lib/httpClient';
import { httpPtm } from '../ptm.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

const row = {
  id: 'ptm-1',
  date: '2026-08-27',
  time: '10:30',
  teacher: 'Mrs. Rao',
  teacher_id: 'teacher-1',
  subject: 'Math',
  child: 'student-1',
  mode: 'In person',
  status: 'pending',
  student_name: 'Aarav Sharma',
};

test('list GET maps a snake_case envelope to the domain type', async () => {
  const calls: { url: string; method?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({ url, method: init?.method ?? 'GET' });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: [row] }),
      };
    }),
  });

  const meetings = await httpPtm(http).list();

  expect(calls[0]).toEqual({ url: 'https://api.test/v1/ptm', method: 'GET' });
  expect(meetings).toEqual([
    {
      id: 'ptm-1',
      date: '2026-08-27',
      time: '10:30',
      teacher: 'Mrs. Rao',
      teacherId: 'teacher-1',
      subject: 'Math',
      studentId: 'student-1',
      studentName: 'Aarav Sharma',
      mode: 'In person',
      status: 'pending',
    },
  ]);
});

test('create POST sends the new-meeting body and maps the created row', async () => {
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
        json: async () => ({ data: { ...row, mode: 'Video call' } }),
      };
    }),
  });

  // `mode` is human-readable display text — the parent app renders it verbatim and
  // derives its icon from `mode.startsWith('Video')` — so the wire value must be the
  // exact label chosen in the UI, not a machine code.
  const saved = await httpPtm(http).create({
    studentId: 'student-1',
    subject: 'Math',
    date: '2026-08-27',
    time: '10:30',
    mode: 'Video call',
  });

  expect(calls[0]).toEqual({
    url: 'https://api.test/v1/ptm',
    method: 'POST',
    body: {
      student_id: 'student-1',
      subject: 'Math',
      date: '2026-08-27',
      time: '10:30',
      mode: 'Video call',
    },
  });
  expect(saved.mode).toBe('Video call');
  expect(saved.studentName).toBe('Aarav Sharma');
  expect(saved.studentId).toBe('student-1');
  expect(saved.status).toBe('pending');
});

test('remove DELETEs the meeting by id', async () => {
  const calls: { url: string; method?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({ url, method: init?.method ?? 'GET' });
      return {
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: async () => ({}),
      };
    }),
  });

  await httpPtm(http).remove('ptm-1');

  expect(calls[0]).toEqual({ url: 'https://api.test/v1/ptm/ptm-1', method: 'DELETE' });
});
