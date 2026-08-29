import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function usePayslips() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const query = useQuery({
    queryKey: queryKeys.payroll(tenantId),
    queryFn: () => repos.payroll.list(),
  });

  // Refetch when opening payslip so backfill / newly-run payroll appears without app restart.
  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query.refetch])
  );

  return query;
}
