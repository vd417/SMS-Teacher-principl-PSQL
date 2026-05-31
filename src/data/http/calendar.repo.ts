import type { CalendarRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toCalendarEvent, type CalendarEventDTO } from './mappers';

export function httpCalendar(http: HttpClient): CalendarRepository {
  return {
    list: () => http.get<CalendarEventDTO[]>('/calendar').then((d) => d.map(toCalendarEvent)),
  };
}
