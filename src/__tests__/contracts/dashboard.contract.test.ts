import { dashboardContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { DashboardStatsDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: DashboardStatsDTO = {
  total_students: 20,
  total_classes: 4,
  attendance_today: 94,
  pending_assignments: 3,
  upcoming_exams: 2,
};

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

dashboardContract('mock', async () => mockDashboard(await createStore()));
dashboardContract('http', async () =>
  httpDashboard(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
