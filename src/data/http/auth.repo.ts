import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toSession, toUser, type SessionDTO } from './mappers';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    login: (email, password) =>
      http.post<SessionDTO>('/auth/login', { email, password }).then(toSession),
    refresh: (refreshToken) =>
      http.post<SessionDTO>('/auth/refresh', { refreshToken }).then(toSession),
    me: () => http.get<SessionDTO['user']>('/auth/me').then(toUser),
    logout: () => http.post<void>('/auth/logout'),
  };
}
