import { calendarContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockCalendar } from '@/data/mock/calendar.repo';
import { httpCalendar } from '@/data/http/calendar.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { CalendarEventDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: CalendarEventDTO[] = [
  {
    id: 'ev1',
    title: 'Mid-Term Math Exam (9-A)',
    date: '2026-05-10',
    time: '9:00 AM',
    type: 'exam',
    description: 'Algebra, Geometry, Number Theory',
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

calendarContract('mock', async () => mockCalendar(await createStore()));
calendarContract('http', async () =>
  httpCalendar(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
