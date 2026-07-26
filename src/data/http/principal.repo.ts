import type { PrincipalRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import {
  toPrincipalOverview,
  principalOverviewSchema,
  toSchoolAttendance,
  schoolAttendanceSchema,
} from './mappers';

export function httpPrincipal(http: HttpClient): PrincipalRepository {
  return {
    overview: () =>
      http
        .get('/principal/overview')
        .then((x) => toPrincipalOverview(principalOverviewSchema.parse(x))),
    attendance: (date) =>
      http
        .get('/principal/attendance', { params: { date } })
        .then((x) => toSchoolAttendance(schoolAttendanceSchema.parse(x))),
  };
}
