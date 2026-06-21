import type { DashboardRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toDashboardStats, dashboardStatsSchema } from './mappers';

export function httpDashboard(http: HttpClient): DashboardRepository {
  return {
    stats: () =>
      http.get('/dashboard/stats').then((x) => toDashboardStats(dashboardStatsSchema.parse(x))),
  };
}
