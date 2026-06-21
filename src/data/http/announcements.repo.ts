import type { AnnouncementsRepository, NewAnnouncementInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAnnouncement, announcementSchema } from './mappers';

export function httpAnnouncements(http: HttpClient): AnnouncementsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/announcements')
        .then((d) => d.map((x) => toAnnouncement(announcementSchema.parse(x)))),

    create: (input: NewAnnouncementInput) =>
      http.post('/announcements', input).then((x) => toAnnouncement(announcementSchema.parse(x))),
  };
}
