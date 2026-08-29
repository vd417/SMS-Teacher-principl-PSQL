import type { NotificationsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { notificationSchema, toNotification } from './mappers';

export function httpNotifications(http: HttpClient): NotificationsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/notifications')
        .then((d) => d.map((x) => toNotification(notificationSchema.parse(x)))),
    markRead: () => http.post('/notifications/read').then(() => undefined),
  };
}
