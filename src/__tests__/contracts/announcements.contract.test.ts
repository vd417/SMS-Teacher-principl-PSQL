import { announcementsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockAnnouncements } from '@/data/mock/announcements.repo';
import { httpAnnouncements } from '@/data/http/announcements.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { AnnouncementDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: AnnouncementDTO[] = [
  {
    id: 'an1',
    title: 'Annual Sports Day',
    body: 'The Annual Sports Day will be held on May 15th, 2026.',
    date: '2026-04-25',
    from: 'Principal Johnson',
    type: 'event',
    pinned: true,
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

announcementsContract('mock', async () => mockAnnouncements(await createStore()));
announcementsContract('http', async () =>
  httpAnnouncements(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
