import type { TimetableRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toTimetableSlot, timetableSlotSchema } from './mappers';

export function httpTimetable(http: HttpClient): TimetableRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/timetable')
        .then((d) => d.map((x) => toTimetableSlot(timetableSlotSchema.parse(x)))),
  };
}
