import { liveEventQueryKeys, liveEventType, liveHubUrl } from '../liveEvents';

describe('liveHubUrl', () => {
  it('strips the /v1 API prefix so the hub sits on the API origin', () => {
    expect(liveHubUrl('http://localhost:5162/v1')).toBe('http://localhost:5162/hubs/live');
    expect(liveHubUrl('http://localhost:5162/v1/')).toBe('http://localhost:5162/hubs/live');
  });
});

function prefixes(type: string): string[] {
  return liveEventQueryKeys(type).map((k) => String(k[0]));
}

describe('liveEventQueryKeys', () => {
  it('maps attendance to teacher, principal, and dashboard caches', () => {
    expect(prefixes('attendance')).toEqual(
      expect.arrayContaining(['attendance', 'dashboard', 'principal', 'myAttendance'])
    );
  });

  it('maps homework to assignments and chat to chat', () => {
    expect(prefixes('homework')).toContain('assignments');
    expect(prefixes('chat')).toContain('chat');
  });

  it('maps exams, grades, timetable, leave, and transport', () => {
    expect(prefixes('exams')).toEqual(expect.arrayContaining(['exams', 'grades']));
    expect(prefixes('grades')).toContain('grades');
    expect(prefixes('timetable')).toEqual(expect.arrayContaining(['timetable', 'attendance']));
    expect(prefixes('leave')).toEqual(expect.arrayContaining(['leave', 'approvals']));
    expect(prefixes('transport')).toEqual(expect.arrayContaining(['bus', 'principal']));
  });

  it('maps announcements and notifications', () => {
    expect(prefixes('announcement')).toEqual(
      expect.arrayContaining(['announcements', 'notifications'])
    );
    expect(prefixes('notification')).toContain('notifications');
  });

  it('returns nothing for unknown types', () => {
    expect(liveEventQueryKeys('fees')).toEqual([]);
    expect(liveEventQueryKeys('')).toEqual([]);
  });
});

describe('liveEventType', () => {
  it('accepts PascalCase payloads from SignalR', () => {
    expect(liveEventType({ Type: 'Attendance' })).toBe('attendance');
    expect(liveEventType({ type: 'chat' })).toBe('chat');
  });
});
