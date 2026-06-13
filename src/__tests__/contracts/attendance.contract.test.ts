import { attendanceContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { AttendanceRecordDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const CLASS_ID = 'c1';
const DATE = '2026-04-27';

// Mutable state for the http fixture so save → forClass round-trip works
let httpStore: AttendanceRecordDTO[] = [
  { student_id: 's1', status: 'present', date: DATE },
  { student_id: 's2', status: 'present', date: DATE },
  { student_id: 's3', status: 'present', date: DATE },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'POST') {
    // save: parse body and update the fixture store
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (body.records) {
      httpStore = body.records.map((r: { student_id: string; status: string; date: string }) => ({
        student_id: r.student_id,
        status: r.status as AttendanceRecordDTO['status'],
        date: r.date,
      }));
    }
    return {
      ok: true,
      status: 204,
      json: async () => null,
      text: async () => '',
    } as Response;
  }

  // GET /classes/:id/attendance?date=...
  if (urlStr.includes('/attendance')) {
    return {
      ok: true,
      status: 200,
      json: async () => httpStore,
      text: async () => JSON.stringify(httpStore),
    } as Response;
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ error: 'not found' }),
    text: async () => 'not found',
  } as Response;
}) as unknown as typeof fetch;

attendanceContract('mock', CLASS_ID, DATE, async () => mockAttendance(await createStore()));
attendanceContract('http', CLASS_ID, DATE, async () =>
  httpAttendance(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
