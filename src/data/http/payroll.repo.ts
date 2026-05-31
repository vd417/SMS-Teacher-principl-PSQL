import type { PayrollRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toPayslip, type PayslipDTO } from './mappers';

export function httpPayroll(http: HttpClient): PayrollRepository {
  return {
    list: () => http.get<PayslipDTO[]>('/payslips').then((d) => d.map(toPayslip)),
  };
}
