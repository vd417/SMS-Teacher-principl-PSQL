import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { todayISO } from '@/lib/date';
import { findSchoolClosedToday } from '@/lib/schoolDay';
import type { Announcement } from '@/data/domain';

export function useCalendar() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.calendar(tenantId),
    queryFn: () => repos.calendar.list(),
  });
}

/** Today's holiday / closure from admin calendar (and matching announcements). */
export function useSchoolClosedToday(announcements: Announcement[] = []) {
  const { data: calendar = [] } = useCalendar();
  const today = todayISO();
  return useMemo(
    () => findSchoolClosedToday(today, calendar, announcements),
    [today, calendar, announcements]
  );
}
