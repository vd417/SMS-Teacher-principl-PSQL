import type { LeaveRepository, NewLeaveInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toLeaveRequest, fromNewLeave, leaveResponseSchema } from './mappers';

export function httpLeave(http: HttpClient): LeaveRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/leave')
        .then((d) => d.map((x) => toLeaveRequest(leaveResponseSchema.parse(x)))),

    create: (input: NewLeaveInput) =>
      http
        .post('/leave', fromNewLeave(input))
        .then((x) => toLeaveRequest(leaveResponseSchema.parse(x))),
  };
}
