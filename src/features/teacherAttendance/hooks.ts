import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { useFeature } from '@/features/plan/hooks';
import { queryKeys } from '@/lib/queryClient';
import { getCurrentPosition, buildCheckEvent, buildManualCheckEvent } from '@/lib/geofence';
import { AppError, isAppError } from '@/lib/errors';
import type { CheckEventKind } from '@/data/domain';

export const STAFF_CHECKIN_FEATURE = 'attendance';
export const GEOFENCE_FEATURE = 'attendance.geofence';

export const GEO_CHECKIN_UPGRADE_MESSAGE =
  'GPS geo-fence check-in is available on the Platinum plan.';

export const GEO_CHECKIN_LOCKED_MESSAGE = 'Staff check-in is not available on your plan.';

/** Error thrown when staff check-in is not allowed on the current plan. */
export function staffCheckInError(): AppError {
  return new AppError({
    code: 'feature_locked',
    status: 403,
    message: GEO_CHECKIN_LOCKED_MESSAGE,
  });
}

/** @deprecated use staffCheckInError — kept for existing tests */
export function geofencePunchError(): AppError {
  return staffCheckInError();
}

export function useStaffCheckInAllowed() {
  return useFeature(STAFF_CHECKIN_FEATURE);
}

export function useGeofenceAllowed() {
  return useFeature(GEOFENCE_FEATURE);
}

export function useSchoolLocation() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { allowed } = useGeofenceAllowed();
  return useQuery({
    queryKey: queryKeys.schoolLocation(tenantId),
    queryFn: async () => {
      try {
        return await repos.myAttendance.schoolLocation();
      } catch (e) {
        if (isAppError(e) && e.status === 404) return null;
        throw e;
      }
    },
    enabled: allowed,
    staleTime: 60 * 60 * 1000,
  });
}

export function useMyAttendanceToday() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { allowed } = useStaffCheckInAllowed();
  return useQuery({
    queryKey: queryKeys.myAttendanceToday(tenantId),
    queryFn: () => repos.myAttendance.today(),
    enabled: allowed,
  });
}

export function useMyAttendanceHistory(limit = 30) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { allowed } = useStaffCheckInAllowed();
  return useQuery({
    queryKey: queryKeys.myAttendanceHistory(tenantId, limit),
    queryFn: () => repos.myAttendance.history(limit),
    enabled: allowed,
  });
}

export function useMyAttendanceSummary(month: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { allowed } = useStaffCheckInAllowed();
  return useQuery({
    queryKey: queryKeys.myAttendanceSummary(tenantId, month),
    queryFn: () => repos.myAttendance.summary(month),
    enabled: allowed && month !== '',
  });
}

/**
 * Records check-in/out. Platinum uses GPS geofence; Silver/Gold use manual punch (time only).
 */
export function usePunch() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const { allowed: staffAllowed } = useStaffCheckInAllowed();
  const { allowed: geoAllowed } = useGeofenceAllowed();

  return useMutation({
    mutationFn: async (kind: CheckEventKind) => {
      if (!staffAllowed) throw staffCheckInError();

      if (geoAllowed) {
        const pos = await getCurrentPosition();
        let school = null as Awaited<ReturnType<typeof repos.myAttendance.schoolLocation>> | null;
        try {
          school = await repos.myAttendance.schoolLocation();
        } catch (e) {
          if (!isAppError(e) || e.status !== 404) throw e;
        }
        if (school) {
          const event = buildCheckEvent(kind, pos, school);
          return repos.myAttendance.punch(event);
        }
        // Platinum but campus GPS not set yet — fall back to manual punch.
        return repos.myAttendance.punch(buildManualCheckEvent(kind));
      }

      return repos.myAttendance.punch(buildManualCheckEvent(kind));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceToday(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceHistoryPrefix(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceSummaryPrefix(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.principalOverview(tenantId) });
      qc.invalidateQueries({ queryKey: ['principal', tenantId, 'attendance'] });
    },
  });
}
