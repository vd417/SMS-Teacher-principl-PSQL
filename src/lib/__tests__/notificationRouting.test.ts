import { resolveNotificationRoute } from '../notificationRouting';

describe('resolveNotificationRoute', () => {
  it('routes chat notifications by icon, since the title is just the sender name', () => {
    expect(resolveNotificationRoute({ icon: 'chatbubbles', title: 'Priya Sharma' }, false)).toEqual(
      {
        kind: 'tab',
        tab: 'Inbox',
      }
    );
    expect(resolveNotificationRoute({ icon: 'chatbubbles', title: 'Priya Sharma' }, true)).toEqual({
      kind: 'tab',
      tab: 'PInbox',
    });
  });

  it('routes homework notifications to Assignments by icon', () => {
    expect(
      resolveNotificationRoute({ icon: 'book', title: 'Homework: Algebra worksheet' }, false)
    ).toEqual({
      kind: 'screen',
      screen: 'AssignmentsScreen',
    });
  });

  it('routes timetable notifications to the Timetable tab for teachers, nowhere for principals', () => {
    expect(
      resolveNotificationRoute({ icon: 'calendar', title: 'Timetable updated' }, false)
    ).toEqual({
      kind: 'tab',
      tab: 'Timetable',
    });
    expect(
      resolveNotificationRoute({ icon: 'calendar', title: 'Timetable updated' }, true)
    ).toBeNull();
  });

  it('falls back to the title prefix for generic "bell" notifications', () => {
    expect(resolveNotificationRoute({ icon: 'bell', title: 'Class test: Unit 3' }, false)).toEqual({
      kind: 'screen',
      screen: 'ExamsScreen',
    });
    expect(
      resolveNotificationRoute({ icon: 'bell', title: 'Leave request approved' }, false)
    ).toEqual({
      kind: 'screen',
      screen: 'LeaveScreen',
    });
  });

  it('routes absence-alert notifications to the role-appropriate attendance screen', () => {
    expect(
      resolveNotificationRoute(
        { icon: 'bell', title: '3 students absent 2+ day(s) in a row' },
        false
      )
    ).toEqual({ kind: 'screen', screen: 'AttendancePickClass' });
    expect(
      resolveNotificationRoute(
        { icon: 'bell', title: '3 students absent 2+ day(s) in a row' },
        true
      )
    ).toEqual({ kind: 'screen', screen: 'PrincipalAttendanceScreen' });
  });

  it('returns null for a plain announcement — it is already on-screen', () => {
    expect(
      resolveNotificationRoute({ icon: 'bell', title: 'Announcement: Sports Day' }, false)
    ).toBeNull();
  });
});
