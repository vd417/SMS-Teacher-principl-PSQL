import type { LeaveRepository, NewLeaveInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toLeaveRequest, fromNewLeave, type LeaveRequestDTO } from './mappers';

export function httpLeave(http: HttpClient): LeaveRepository {
  return {
    list: () => http.get<LeaveRequestDTO[]>('/leave').then((d) => d.map(toLeaveRequest)),

    create: (input: NewLeaveInput) =>
      http.post<LeaveRequestDTO>('/leave', fromNewLeave(input)).then(toLeaveRequest),
  };
}
