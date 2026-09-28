import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SchoolStaffMember, StaffAttendanceEntry } from '@/data/domain';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth, useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { mergeSchoolStaffDirectory } from '@/lib/mergeSchoolStaffDirectory';
import { staffDisplayLabel } from '@/lib/staffCategory';

function staffEntryToMember(entry: StaffAttendanceEntry): SchoolStaffMember {
  const label = staffDisplayLabel(entry);
  return {
    id: entry.teacherId,
    name: entry.name,
    initials: entry.initials,
    phone: entry.phone?.trim() || undefined,
    roleLabel: label,
    subtitle: label,
    checkedIn: entry.checkedIn,
    checkInAt: entry.checkInAt,
    checkOutAt: entry.checkOutAt,
    checkInVerified: entry.checkInVerified,
  };
}

export function useSchoolStaffDirectory() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const selfName = session?.user.name?.trim().toLowerCase() ?? '';

  const principalQ = useQuery({
    queryKey: queryKeys.principalOverview(tenantId),
    queryFn: () => repos.principal.overview(),
    enabled: isPrincipal,
  });

  const teachersQ = useQuery({
    queryKey: queryKeys.teachers(tenantId),
    queryFn: () => repos.teachers.list(),
    enabled: !isPrincipal,
  });

  // A-9 (STF-01): GET /staff is school.principal-only (SD-1: teachers do not
  // get the non-teaching staff directory), so it always 403s for a teacher.
  // Never call it outside the principal branch above.
  const members = useMemo(() => {
    const rows: SchoolStaffMember[] = isPrincipal
      ? (principalQ.data?.staff ?? []).map(staffEntryToMember)
      : mergeSchoolStaffDirectory(teachersQ.data ?? [], []);

    if (!selfName) return rows;
    return rows.filter((m) => m.name.trim().toLowerCase() !== selfName);
  }, [isPrincipal, principalQ.data, teachersQ.data, selfName]);

  return {
    members,
    isLoading: isPrincipal ? principalQ.isLoading : teachersQ.isLoading,
    isError: isPrincipal ? principalQ.isError : teachersQ.isError,
    isFetching: isPrincipal ? principalQ.isFetching : teachersQ.isFetching,
    refetch: isPrincipal ? principalQ.refetch : teachersQ.refetch,
  };
}
