import type { PtmRepository, NewPtmInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toPtmMeeting, fromNewPtm, ptmMeetingSchema } from './mappers';

export function httpPtm(http: HttpClient): PtmRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/ptm')
        .then((d) => d.map((x) => toPtmMeeting(ptmMeetingSchema.parse(x)))),

    create: (input: NewPtmInput) =>
      http.post('/ptm', fromNewPtm(input)).then((x) => toPtmMeeting(ptmMeetingSchema.parse(x))),

    remove: (id: string) => http.delete(`/ptm/${id}`),
  };
}
