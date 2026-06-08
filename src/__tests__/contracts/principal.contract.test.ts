import { principalContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockPrincipal } from '@/data/mock/principal.repo';
import { httpPrincipal } from '@/data/http/principal.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { PrincipalOverviewDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: PrincipalOverviewDTO = {
  kpis: { students_present_pct: 94, staff_present: 3, staff_total: 5, pending_approvals: 4 },
  staff: [
    {
      teacher_id: 'u_aanya',
      name: 'Aanya Krishnan',
      initials: 'AK',
      subject: 'Mathematics',
      phone: '+1 (415) 555-0118',
      checked_in: true,
      check_in_at: '2026-06-08T08:02:00.000Z',
    },
  ],
};

const fetchImpl = jest.fn(
  async () =>
    ({
      ok: true,
      status: 200,
      json: async () => FIXTURE,
      text: async () => JSON.stringify(FIXTURE),
    }) as Response
) as unknown as typeof fetch;

principalContract('mock', async () => mockPrincipal(await createStore()));
principalContract('http', async () =>
  httpPrincipal(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
