import type { TimetableRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toTimetableSlot, type TimetableSlotDTO } from './mappers';

export function httpTimetable(http: HttpClient): TimetableRepository {
  return {
    list: () => http.get<TimetableSlotDTO[]>('/timetable').then((d) => d.map(toTimetableSlot)),
  };
}
