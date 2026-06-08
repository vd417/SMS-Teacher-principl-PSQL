# Principal Role in the Mobile App — Design

**Date:** 2026-06-08
**Status:** Approved (pending written-spec review)
**Branch:** feat/bus-duty-tracking (feature will branch from main)

## Summary

Add a **Principal** role to the (currently teacher-only) mobile app. The Principal
already has a full **web admin panel** (`sms-admin`, where the role is defined as
_"final approver + all reports"_). On mobile the Principal gets a focused, triage-
oriented subset: an oversight **Home**, an **Approvals** inbox for actioning teacher
requests on the go, the same **geofenced self check-in** teachers use, and a few
reuse-heavy oversight views (announcements broadcast, live bus, school calendar,
teacher directory).

The teacher experience is **unchanged**. The Principal experience is rendered by the
same app, branched on `session.user.role`. Heavier admin-panel features (fees,
payroll, full SIS, exam publishing, report cards) intentionally **stay on the web
panel** — they don't fit a phone.

**Mock-first:** all new data lives behind the existing repository interface
(`src/data/repositories/types.ts`), implemented in `src/data/mock/*` now. A real
.NET backend drops in later via the http repos with no screen changes.

## Decisions (from brainstorming)

| Question                               | Decision                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Principal experience location          | **Same app, role decides UI.** One app; login role branches navigation.                                                                                            |
| Roles in this app                      | `Role = 'teacher' \| 'principal'` only (admin panel has 4; mobile needs 2).                                                                                        |
| Login / role source                    | **Two one-tap demo accounts** (teacher + principal) on the login screen; the account's `role` decides. Real/http auth just reads `role` from the backend response. |
| Navigation model                       | **Separate `PrincipalTabNavigator`** (Home · Approvals · Calendar · Inbox · Profile). Teacher `MainTabNavigator` untouched. Shared screens referenced from both.   |
| Self check-in                          | **Reuse** the existing geofence feature (role-agnostic). Surfaced on Principal Home + the existing My Attendance screen.                                           |
| Approvals scope                        | **Leave + Attendance correction.** Unified `Request` model; principal sees all teachers' pending requests and decides them.                                        |
| "Smart quick request" (principal side) | One-tap **Approve / Reject** with **canned reject reasons** instead of free typing.                                                                                |
| Teacher-side quick-request presets     | **Follow-up spec** (out of scope here).                                                                                                                            |
| Attendance-correction raise flow       | Teacher-side UI to _raise_ corrections is **follow-up**; this spec **seeds** corrections in mock so the principal approval side is real now.                       |
| Reuse add-ons included                 | **Broadcast announcements, live bus tracking, school calendar, teacher directory.**                                                                                |
| Out of scope (stay on web)             | Fees, payroll, full SIS, exam publishing, report cards, individual student drill-down.                                                                             |

## Architecture

### Role foundation

- `src/data/domain/index.ts`: widen `Role` to `'teacher' | 'principal'`. No other change
  to `User` / `Session` — `role` already flows through both mock and http auth repos.
- Seed a Principal demo user (**Sunita Rao, Principal**, matching the admin panel demo)
  in `src/data/mock/auth.repo.ts` / seed.
- `LoginScreen`: two one-tap demo logins (teacher + principal).

### Navigation

- `RootNavigator` adds one branch after auth: `role === 'principal'` →
  `PrincipalTabNavigator`, else the existing `MainTabNavigator` (unchanged).
- New `src/navigation/PrincipalTabNavigator.tsx`. Tabs: **Home, Approvals, Calendar,
  Inbox, Profile**.
- **Reused as-is by the principal:** Chat/Inbox, Profile, MyAttendance (self check-in),
  Settings, CalendarScreen, BusScreen, AnnouncementsScreen.
- Add-on screens reachable from Home shortcuts (not tabs): Broadcast Announcement,
  Live Bus, Teacher Directory.

### Data layer (mock, behind repository interface)

- **`principal` dashboard data** — KPIs (`studentsPresentPct`, `staffPresent`/`staffTotal`,
  `pendingApprovals`), `recentApprovals` (top 3), `staffAttendance` (teachers not yet
  checked in today). Either a new `principal.repo.ts` or an extension of `dashboard`.
- **Unified `Request` model** — `{ id, type: 'leave' | 'attendance_correction', requester,
requesterRole, detail, dates?, reason?, substitute?, status: 'pending'|'approved'|'rejected',
priority, appliedOn, decidedNote? }`. Existing `LeaveRequest` is the `type: 'leave'` case;
  reshape or wrap it so the principal list is uniform and extensible.
- **Repo methods:** principal `requests.list()` returns all teachers' requests;
  `requests.decide(id, 'approved' | 'rejected', note?)` mutates status + persists.
- **Teacher directory** — list of teachers from chat contacts + the staff-attendance data,
  with tap-to-chat / tap-to-call.
- **Announcement create** — `announcements.create(input)` for principal broadcast (reuses
  the existing `Announcement` type; `AnnouncementsScreen` gains a compose action).
- Seed several **pending** requests (leave + attendance corrections) from different teachers.

## Screens / components

### Principal Home (new)

Read-only triage surface, top to bottom:

1. **Self check-in card** — reuse `PunchButton` + check-in hook.
2. **Today at a glance** — KPI row from the principal dashboard mock.
3. **Approvals preview** — top 3 pending requests, "View all →" into the Approvals tab.
4. **Staff attendance peek** — teachers not yet checked in today.
5. **Quick shortcuts** — Broadcast Announcement · Live Bus · Teacher Directory.

### Approvals (new)

- Pending requests grouped by urgency; each card shows requester, type, dates/detail,
  reason, substitute.
- Actions: **Approve** / **Reject** (reject offers canned reasons + optional note).
- Acting calls `requests.decide(...)`; card animates out. Empty state: "All caught up."

### Teacher Directory (new, lightweight)

- List of teachers (name, subject, checked-in status dot), tap to chat or call.

### Reused screens

- **AnnouncementsScreen** — add principal compose/post action.
- **BusScreen, CalendarScreen, ChatScreen, ProfileScreen, MyAttendanceScreen, SettingsScreen**
  — referenced from the principal navigator unchanged.

## Error handling & states

- Every new repo method is async with loading / error / empty states, matching existing
  screens (`src/components/ui` state helpers).
- `decide()` failure: keep the card, show an error toast, allow retry (no optimistic loss).
- Check-in errors: unchanged from the existing geofence feature.

## Testing

- **Domain/seed:** principal user seeded; `Role` union; pending requests seeded.
- **Repo contracts:** `requests.list` / `requests.decide`, principal dashboard,
  `announcements.create` — mock + http contract tests mirroring existing
  `src/__tests__/contracts/*` and `src/__tests__/data/*`.
- **Hooks:** principal dashboard hook, requests/decide hook (loading/success/error).
- **Navigation:** `role === 'principal'` renders `PrincipalTabNavigator`; teacher role
  still renders `MainTabNavigator` (auth-gate test extended).
- **UI:** Approvals approve/reject flow; empty state; Home renders KPIs.

## Out of scope (explicit)

- Teacher-side one-tap quick-request presets — **follow-up spec**.
- Teacher-side UI to raise attendance corrections — **follow-up** (seeded in mock now).
- Fees, payroll, SIS, exam publishing, report cards, student drill-down — **web panel only**.
- Additional roles (`admin`, `vice_principal`) — not needed on mobile.
