import type { DashboardRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toDashboardStats, type DashboardStatsDTO } from './mappers';

export function httpDashboard(http: HttpClient): DashboardRepository {
  return {
    stats: () => http.get<DashboardStatsDTO>('/dashboard/stats').then(toDashboardStats),
  };
}
