import type { PayrollRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toPayslip, payslipSchema } from './mappers';

export function httpPayroll(http: HttpClient): PayrollRepository {
  return {
    list: () =>
      http.get<unknown[]>('/payslips').then((d) => d.map((x) => toPayslip(payslipSchema.parse(x)))),
  };
}
