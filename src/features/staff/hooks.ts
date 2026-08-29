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

  const staffQ = useQuery({
    queryKey: queryKeys.staffDirectory(tenantId),
    queryFn: () => repos.staff.list(),
    enabled: !isPrincipal,
  });

  const members = useMemo(() => {
    const rows: SchoolStaffMember[] = isPrincipal
      ? (principalQ.data?.staff ?? []).map(staffEntryToMember)
      : mergeSchoolStaffDirectory(teachersQ.data ?? [], staffQ.data ?? []);

    if (!selfName) return rows;
    return rows.filter((m) => m.name.trim().toLowerCase() !== selfName);
  }, [isPrincipal, principalQ.data, teachersQ.data, staffQ.data, selfName]);

  return {
    members,
    isLoading: isPrincipal ? principalQ.isLoading : teachersQ.isLoading || staffQ.isLoading,
    isError: isPrincipal ? principalQ.isError : teachersQ.isError || staffQ.isError,
    isFetching: isPrincipal ? principalQ.isFetching : teachersQ.isFetching || staffQ.isFetching,
    refetch: isPrincipal
      ? principalQ.refetch
      : async () => {
          await Promise.all([teachersQ.refetch(), staffQ.refetch()]);
        },
  };
}
