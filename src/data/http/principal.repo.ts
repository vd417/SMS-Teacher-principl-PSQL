import type { PrincipalRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import {
  toPrincipalOverview,
  type PrincipalOverviewDTO,
  toSchoolAttendance,
  type SchoolAttendanceDTO,
} from './mappers';

export function httpPrincipal(http: HttpClient): PrincipalRepository {
  return {
    overview: () => http.get<PrincipalOverviewDTO>('/principal/overview').then(toPrincipalOverview),
    attendance: () =>
      http.get<SchoolAttendanceDTO>('/principal/attendance').then(toSchoolAttendance),
  };
}
