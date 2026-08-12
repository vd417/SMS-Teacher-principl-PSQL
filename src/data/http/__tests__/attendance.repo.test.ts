import { createHttpClient } from '@/lib/httpClient';
import { httpAttendance } from '../attendance.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('forClass GET parses full AttendanceRecordResponse rows from the envelope', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: [
          {
            id: 'a1',
            tenant_id: 'tenant-1',
            class_id: 'c1',
            student_id: '880e8400-e29b-41d4-a716-446655440003',
            date: '2026-07-29T00:00:00',
            status: 'late',
            marked_by: '990e8400-e29b-41d4-a716-446655440004',
          },
        ],
      }),
    })),
  });

  const rows = await httpAttendance(http).forClass('c1', '2026-07-29');
  expect(rows).toEqual([
    { studentId: '880e8400-e29b-41d4-a716-446655440003', status: 'L', date: '2026-07-29' },
  ]);
});

test('rollCall GET parses timetable permission metadata from snake_case', async () => {
  const calls: string[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            can_mark: false,
            period: 3,
            subject: 'Science',
            teacher_name: 'Meera Shah',
            reason: 'not_assigned',
            marked: true,
          },
        }),
      };
    }),
  });

  await expect(httpAttendance(http).rollCall('c1', '2026-08-12')).resolves.toEqual({
    canMark: false,
    period: 3,
    subject: 'Science',
    teacherName: 'Meera Shah',
    reason: 'not_assigned',
    marked: true,
  });
  expect(calls[0]).toBe('https://api.test/v1/classes/c1/attendance/roll-call?date=2026-08-12');
});

test('save POST bulk-upserts canonical status words with top-level date', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return {
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: async () => undefined,
      };
    }),
  });

  await httpAttendance(http).save('c1', '2026-07-29', [
    { studentId: 's1', status: 'P', date: '2026-07-29' },
    { studentId: 's2', status: 'V', date: '2026-07-29' },
  ]);

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('https://api.test/v1/classes/c1/attendance');
  expect(calls[0].body).toEqual({
    date: '2026-07-29',
    records: [
      { student_id: 's1', status: 'present' },
      { student_id: 's2', status: 'leave' },
    ],
  });
});

test('forClass returns an empty list when the API data array is empty', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: [] }),
    })),
  });

  await expect(httpAttendance(http).forClass('c1', '2026-07-29')).resolves.toEqual([]);
});

test('save rejects when every student row is missing an id', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => {
      throw new Error('post should not be called');
    }),
  });

  await expect(
    httpAttendance(http).save('c1', '2026-07-29', [
      { studentId: '  ', status: 'P', date: '2026-07-29' },
    ])
  ).rejects.toThrow('No students to save');
});
