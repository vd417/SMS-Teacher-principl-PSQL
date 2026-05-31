import { timetableContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockTimetable } from '@/data/mock/timetable.repo';
import { httpTimetable } from '@/data/http/timetable.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { TimetableSlotDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: TimetableSlotDTO[] = [
  {
    id: 't1',
    day: 'Mon',
    period: 1,
    subject: 'Mathematics',
    class_id: 'c1',
    class_name: 'Grade 9-A',
    room: 'Room 214',
    start_time: '8:00',
    end_time: '8:45',
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

timetableContract('mock', async () => mockTimetable(await createStore()));
timetableContract('http', async () =>
  httpTimetable(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
