import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewAnnouncementInput } from '@/data/repositories/types';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId, useAuth } from '@/features/auth/AuthProvider';
import { filterAnnouncementsForRole } from '@/lib/announcementAudience';
import { queryKeys } from '@/lib/queryClient';

export function useAnnouncements() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { session } = useAuth();
  const role = session?.user.role ?? 'teacher';

  const query = useQuery({
    queryKey: queryKeys.announcements(tenantId),
    queryFn: () => repos.announcements.list(),
  });

  const data = useMemo(
    () => filterAnnouncementsForRole(query.data ?? [], role),
    [query.data, role]
  );

  return { ...query, data };
}

export function useAppNotifications() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.notifications(tenantId),
    queryFn: () => repos.notifications.list(),
  });
}

export function useMarkNotificationsRead() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repos.notifications.markRead(),
    onSuccess: () => {
      qc.setQueryData<import('@/data/domain').AppNotification[]>(
        queryKeys.notifications(tenantId),
        (prev) => prev?.map((n) => ({ ...n, unread: false }))
      );
    },
  });
}

export function useCreateAnnouncement() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAnnouncementInput) => repos.announcements.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.notifications(tenantId) });
    },
  });
}
