import type { CheckEvent, CheckEventKind } from '@/data/domain';
import { isAppError } from '@/lib/errors';

export function formatPunchDistance(ev: CheckEvent, schoolConfigured: boolean): string {
  if (!schoolConfigured) return 'School location not set — ask your admin';
  if (!ev.verified && ev.distanceMeters === 0) return 'Could not verify distance to school';
  if (ev.verified) return `${Math.round(ev.distanceMeters)} m from school`;
  return formatOutsideSchoolDistance(ev.distanceMeters);
}

/** Human-readable distance when outside the campus geo-fence. */
export function formatOutsideSchoolDistance(meters: number): string {
  const m = Math.round(meters);
  if (m >= 1000) return `~${(m / 1000).toFixed(1)} km from school`;
  return `${m} m from school`;
}

/** Label for a punch in the UI — manual vs geo-fence. */
export function formatPunchLabel(
  ev: CheckEvent,
  opts: { geo: boolean; schoolConfigured: boolean }
): string {
  if (!opts.geo) return 'Manual check-in';
  if (!ev.verified && ev.distanceMeters > 0) {
    return `Outside campus · ${formatOutsideSchoolDistance(ev.distanceMeters)}`;
  }
  return formatPunchDistance(ev, opts.schoolConfigured);
}

/** Toast after a successful punch. */
export function punchSuccessMessage(
  kind: CheckEventKind,
  ev: CheckEvent | undefined,
  opts: { geo: boolean; schoolConfigured: boolean }
): { msg: string; type: 'success' | 'warning' } {
  const action = kind === 'in' ? 'Checked in' : 'Checked out';
  if (!ev) return { msg: `${action} ✓`, type: 'success' };

  if (opts.geo && !ev.verified && ev.distanceMeters > 0) {
    return {
      msg: `You're outside the school campus (${formatOutsideSchoolDistance(ev.distanceMeters)}). ${action} — flagged for review.`,
      type: 'warning',
    };
  }

  return {
    msg: `${action} — ${formatPunchLabel(ev, opts)} ✓`,
    type: 'success',
  };
}

/** Friendly message when punch API fails. */
export function punchErrorMessage(e: unknown): string {
  if (!isAppError(e)) return 'Could not record check-in. Please try again.';

  switch (e.code) {
    case 'outside_geofence':
      return "You're outside the school campus. Move closer to school, or your check-in may be flagged.";
    case 'school_location_not_configured':
      return 'School GPS is not set up yet. Ask your admin to configure the campus location.';
    case 'location_permission_denied':
      return 'Turn on location permission to check in with GPS.';
    case 'location_timeout':
    case 'location_off':
      return "Couldn't get your location. Try again near a window or outdoors.";
    case 'feature_locked':
      return e.message;
    default:
      return e.message || 'Could not record check-in. Please try again.';
  }
}

export const OUTSIDE_SCHOOL_BADGE = 'Outside school campus';

/** Monthly hours worked — one decimal, with unit. */
export function formatAttendanceHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return '–';
  if (hours === 0) return '0 h';
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} h`;
}
