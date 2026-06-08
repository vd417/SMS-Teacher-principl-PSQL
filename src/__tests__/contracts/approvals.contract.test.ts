import { approvalsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockApprovals } from '@/data/mock/approvals.repo';
import { httpApprovals } from '@/data/http/approvals.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ApprovalRequestDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: ApprovalRequestDTO[] = [
  {
    id: 'ar1',
    type: 'leave',
    requester_id: 'u_rajesh',
    requester_name: 'Rajesh Kumar',
    requester_initials: 'RK',
    title: 'Casual leave · 3 days',
    detail: 'Casual leave 12–14 Jun.',
    from: '2026-06-12',
    to: '2026-06-14',
    reason: 'Family function.',
    priority: 'low',
    status: 'pending',
    applied_on: '2026-06-06',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  if (method === 'PATCH') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const updated: ApprovalRequestDTO = {
      ...FIXTURE[0],
      status: body.status,
      decided_note: body.decided_note,
    };
    return {
      ok: true,
      status: 200,
      json: async () => updated,
      text: async () => JSON.stringify(updated),
    } as Response;
  }
  return {
    ok: true,
    status: 200,
    json: async () => FIXTURE,
    text: async () => JSON.stringify(FIXTURE),
  } as Response;
}) as unknown as typeof fetch;

approvalsContract('mock', async () => mockApprovals(await createStore()));
approvalsContract('http', async () =>
  httpApprovals(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
