import type { CalendarRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toCalendarEvent, calendarEventSchema } from './mappers';

export function httpCalendar(http: HttpClient): CalendarRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/calendar')
        .then((d) => d.map((x) => toCalendarEvent(calendarEventSchema.parse(x)))),
  };
}
