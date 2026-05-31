import type { AnnouncementsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAnnouncement, type AnnouncementDTO } from './mappers';

export function httpAnnouncements(http: HttpClient): AnnouncementsRepository {
  return {
    list: () => http.get<AnnouncementDTO[]>('/announcements').then((d) => d.map(toAnnouncement)),
  };
}
