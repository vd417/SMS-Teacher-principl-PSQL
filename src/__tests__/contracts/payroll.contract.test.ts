import { payrollContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockPayroll } from '@/data/mock/payroll.repo';
import { httpPayroll } from '@/data/http/payroll.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { PayslipDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: PayslipDTO[] = [
  {
    id: 'ps1',
    month: 'March',
    year: 2026,
    gross: 6500,
    deductions: 1200,
    net: 5300,
    status: 'paid',
  },
];

const fetchImpl = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => FIXTURE,
  text: async () => JSON.stringify(FIXTURE),
})) as unknown as typeof fetch;

payrollContract('mock', async () => mockPayroll(await createStore()));
payrollContract('http', async () =>
  httpPayroll(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
