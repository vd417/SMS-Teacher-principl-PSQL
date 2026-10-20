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

test('create POST includes the video link, chosen teacher, and teacher notification', async () => {
  const calls: { body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      calls.push({ body: init?.body ? JSON.parse(String(init.body)) : null });
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({
          data: { ...row, mode: 'Video call', meeting_link: 'https://meet.example/abc' },
        }),
      };
    }),
  });

  const saved = await httpPtm(http).create({
    studentId: 'student-1',
    subject: 'Term progress',
    date: '2026-08-27',
    time: '10:30',
    mode: 'Video call',
    meetingLink: 'https://meet.example/abc',
    teacherId: 'teacher-9',
    notifyTeacher: true,
  });

  expect(calls[0].body).toEqual({
    student_id: 'student-1',
    subject: 'Term progress',
    date: '2026-08-27',
    time: '10:30',
    mode: 'Video call',
    meeting_link: 'https://meet.example/abc',
    teacher_id: 'teacher-9',
    notify_teacher: true,
  });
  expect(saved.meetingLink).toBe('https://meet.example/abc');
});

test('create POST marks every listed teacher when All teachers is chosen', async () => {
  const calls: { body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      calls.push({ body: init?.body ? JSON.parse(String(init.body)) : null });
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({ data: row }),
      };
    }),
  });

  await httpPtm(http).create({
    studentId: 'student-1',
    date: '2026-08-27',
    time: '10:30',
    mode: 'In person',
    teacherId: 'teacher-1',
    teacherIds: ['teacher-1', 'teacher-2', 'teacher-3'],
    allTeachers: true,
    notifyTeacher: true,
    notifyCrm: true,
  });

  expect(calls[0].body).toEqual({
    student_id: 'student-1',
    date: '2026-08-27',
    time: '10:30',
    mode: 'In person',
    teacher_id: 'teacher-1',
    teacher_ids: ['teacher-1', 'teacher-2', 'teacher-3'],
    all_teachers: true,
    notify_teacher: true,
    notify_crm: true,
  });
});

test('create POST sends teacher_id from the first picked teacher when no single teacher is set', async () => {
  const calls: { body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      calls.push({ body: init?.body ? JSON.parse(String(init.body)) : null });
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ({ data: row }),
      };
    }),
  });

  await httpPtm(http).create({
    studentId: 'student-1',
    date: '2026-08-27',
    time: '10:30',
    mode: 'In person',
    teacherIds: ['teacher-9', 'teacher-2'],
    notifyTeacher: true,
    notifyCrm: true,
  });

  expect(calls[0].body).toEqual({
    student_id: 'student-1',
    date: '2026-08-27',
    time: '10:30',
    mode: 'In person',
    teacher_id: 'teacher-9',
    teacher_ids: ['teacher-9', 'teacher-2'],
    notify_teacher: true,
    notify_crm: true,
  });
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

test('remove sends the cancel reason and asks for a notification', async () => {
  const calls: { url: string; method?: string; body?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
      return {
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: async () => ({}),
      };
    }),
  });

  await httpPtm(http).remove('ptm-1', { reason: 'Parent unavailable', notify: true });

  expect(calls[0]).toEqual({
    url: 'https://api.test/v1/ptm/ptm-1?reason=Parent+unavailable&notify=true&notify_parent=true&notify_teacher=true&notify_crm=true',
    method: 'DELETE',
    body: JSON.stringify({
      reason: 'Parent unavailable',
      notify: true,
      notify_parent: true,
      notify_teacher: true,
      notify_crm: true,
      notice: 'Meeting cancelled. Parent unavailable',
    }),
  });
});

test('remove still cancels when the server rejects a reason body', async () => {
  const calls: { body?: string }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (_url, init) => {
      calls.push({ body: init?.body as string | undefined });
      if (init?.body) {
        return {
          ok: false,
          status: 415,
          statusText: 'Unsupported Media Type',
          json: async () => ({ error: { code: 'unsupported', message: 'Body not allowed' } }),
        };
      }
      return { ok: true, status: 204, statusText: 'No Content', json: async () => ({}) };
    }),
  });

  await httpPtm(http).remove('ptm-1', { reason: 'Parent unavailable', notify: true });

  expect(calls).toHaveLength(2);
  expect(calls[1].body).toBeUndefined();
});
