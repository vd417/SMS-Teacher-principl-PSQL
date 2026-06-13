import { leaveContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockLeave } from '@/data/mock/leave.repo';
import { httpLeave } from '@/data/http/leave.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { LeaveRequestDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: LeaveRequestDTO[] = [
  {
    id: 'lr1',
    requester_id: 'u1',
    type: 'casual',
    from_date: '2026-03-15',
    to_date: '2026-03-16',
    reason: 'Personal work.',
    status: 'approved',
    applied_on: '2026-03-10',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const created: LeaveRequestDTO = {
      id: 'lr_new',
      requester_id: 'u1',
      type: body.type ?? 'casual',
      from_date: body.from_date,
      to_date: body.to_date,
      reason: body.reason,
      substitute: body.substitute,
      status: 'pending',
      applied_on: new Date().toISOString().slice(0, 10),
    };
    return {
      ok: true,
      status: 201,
      json: async () => created,
      text: async () => JSON.stringify(created),
    } as Response;
  }

  // GET /leave
  return {
    ok: true,
    status: 200,
    json: async () => FIXTURE,
    text: async () => JSON.stringify(FIXTURE),
  } as Response;
}) as unknown as typeof fetch;

leaveContract('mock', async () => mockLeave(await createStore()));
leaveContract('http', async () =>
  httpLeave(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
