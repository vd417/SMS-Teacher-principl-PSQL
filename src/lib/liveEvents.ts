/** SignalR live events for the teacher and principal app. */

export function liveHubUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  const origin = trimmed.replace(/\/v\d+$/i, '');
  return `${origin}/hubs/live`;
}

export function liveEventType(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const row = payload as Record<string, unknown>;
  const raw = row.type ?? row.Type;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Query-key prefixes to invalidate for a live event type. */
export function liveEventQueryKeys(type: string): readonly (readonly unknown[])[] {
  switch (type.trim().toLowerCase()) {
    case 'attendance':
      return [['attendance'], ['dashboard'], ['principal'], ['myAttendance']];
    case 'chat':
      return [['chat']];
    case 'announcement':
      return [['announcements'], ['calendar'], ['notifications'], ['dashboard'], ['principal']];
    case 'notification':
      return [['notifications']];
    case 'homework':
      return [['assignments']];
    case 'grades':
      return [['grades'], ['exams']];
    case 'exams':
      return [['exams'], ['examTerms'], ['grades']];
    case 'timetable':
      return [['timetable'], ['attendance'], ['classes'], ['dashboard']];
    case 'leave':
      return [['leave'], ['approvals']];
    case 'transport':
      return [['bus'], ['principal']];
    default:
      return [];
  }
}
