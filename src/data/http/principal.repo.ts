import type { PrincipalRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toPrincipalOverview, type PrincipalOverviewDTO } from './mappers';

export function httpPrincipal(http: HttpClient): PrincipalRepository {
  return {
    overview: () => http.get<PrincipalOverviewDTO>('/principal/overview').then(toPrincipalOverview),
  };
}
