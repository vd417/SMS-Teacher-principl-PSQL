/**
 * Best-effort routing for tapping an in-app notification.
 *
 * The backend notification feed (`GET /notifications`) has no `type`/`link`
 * field, but every writer (NotificationService/AcademicsCommsNotifier/
 * AbsenceAlertWorker/chat message delivery in sms-backend) sets a category-ish
 * `icon`:
 *   "book"        -> homework                    (CommsModule.cs AcademicsCommsNotifier)
 *   "calendar"    -> timetable published
 *   "chatbubbles" -> new chat message (title is just the sender's name, no
 *                    keyword — icon is the ONLY signal for this case)
 *   "bell"        -> everything else routed through the generic announcement
 *                    channel or the absence-alert worker; title still carries
 *                    a "<Kind>: <text>" prefix here, so fall back to that.
 * Unmatched cases return null — the caller should just leave the user on the
 * notifications list, since there's nothing more specific to jump to.
 */
export type NotificationTarget =
  | { kind: 'screen'; screen: string; params?: Record<string, unknown> }
  | { kind: 'tab'; tab: string };

export function resolveNotificationRoute(
  note: { icon: string; title: string },
  isPrincipal: boolean
): NotificationTarget | null {
  const icon = note.icon.trim().toLowerCase();
  const t = note.title.trim().toLowerCase();

  if (icon === 'chatbubbles') return { kind: 'tab', tab: isPrincipal ? 'PInbox' : 'Inbox' };
  if (icon === 'book') return { kind: 'screen', screen: 'AssignmentsScreen' };
  if (icon === 'calendar') {
    // Teacher has a top-level Timetable tab; principal's timetable is per-class
    // (under Classes), so there's no single screen to jump to — leave as-is.
    return isPrincipal ? null : { kind: 'tab', tab: 'Timetable' };
  }

  // Generic "bell" notifications (and anything with an unrecognized icon)
  // still carry a "<Kind>: <text>" title prefix — fall back to that.
  if (t.startsWith('homework:')) return { kind: 'screen', screen: 'AssignmentsScreen' };
  if (t.startsWith('class test:') || t.startsWith('exam'))
    return { kind: 'screen', screen: 'ExamsScreen' };
  if (t.startsWith('leave')) return { kind: 'screen', screen: 'LeaveScreen' };
  if (t.startsWith('payslip') || t.startsWith('payroll'))
    return { kind: 'screen', screen: 'PayslipScreen' };
  if (t.includes('absent') || t.startsWith('attendance')) {
    return isPrincipal
      ? { kind: 'screen', screen: 'PrincipalAttendanceScreen' }
      : { kind: 'screen', screen: 'AttendancePickClass' };
  }
  if (t.startsWith('timetable')) {
    return isPrincipal ? null : { kind: 'tab', tab: 'Timetable' };
  }
  // "Announcement: ..." and anything unmatched: the notification is already
  // visible right here on the Announcements screen, nothing more to do.
  return null;
}
