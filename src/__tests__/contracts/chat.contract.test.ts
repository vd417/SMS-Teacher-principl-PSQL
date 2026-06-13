import { chatContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockChat } from '@/data/mock/chat.repo';
import { httpChat } from '@/data/http/chat.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ChatContactDTO, ChatMessageDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const CONTACTS_FIXTURE: ChatContactDTO[] = [
  {
    id: 'ch1',
    name: 'Principal Johnson',
    role: 'Principal',
    initials: 'PJ',
    last_message: 'Please submit the exam schedule by Friday.',
    last_at: '9:30 AM',
    unread: 2,
    online: true,
  },
];

const MESSAGES_FIXTURE: ChatMessageDTO[] = [
  {
    id: 'm1',
    thread_id: 'ch1',
    sender_id: 'ch1',
    text: 'Good morning!',
    sent_at: '9:00 AM',
    is_mine: false,
  },
  {
    id: 'm2',
    thread_id: 'ch1',
    sender_id: 'me',
    text: 'Good morning!',
    sent_at: '9:05 AM',
    is_mine: true,
  },
];

const SENT_FIXTURE: ChatMessageDTO = {
  id: 'm_sent',
  thread_id: 'ch1',
  sender_id: 'me',
  text: 'Hello contract test',
  sent_at: '9:10 AM',
  is_mine: true,
};

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'POST' && urlStr.includes('/messages')) {
    return {
      ok: true,
      status: 201,
      json: async () => SENT_FIXTURE,
      text: async () => JSON.stringify(SENT_FIXTURE),
    } as Response;
  }

  if (urlStr.includes('/messages')) {
    return {
      ok: true,
      status: 200,
      json: async () => MESSAGES_FIXTURE,
      text: async () => JSON.stringify(MESSAGES_FIXTURE),
    } as Response;
  }

  // GET /threads — contacts list
  return {
    ok: true,
    status: 200,
    json: async () => CONTACTS_FIXTURE,
    text: async () => JSON.stringify(CONTACTS_FIXTURE),
  } as Response;
}) as unknown as typeof fetch;

chatContract('mock', async () => mockChat(await createStore()));
chatContract('http', async () =>
  httpChat(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
