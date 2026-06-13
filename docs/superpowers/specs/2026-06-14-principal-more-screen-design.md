# Principal "More / All features" screen — design

**Date:** 2026-06-14
**Status:** Approved
**Related:** `docs/superpowers/specs/2026-06-08-principal-role-mobile-design.md` (principal role)

## Problem

Teacher mode has a **More** screen (titled "All features") — a grid of every feature,
opened by tapping the profile avatar on Home. Principal mode has tabs
(Home / Approvals / Attendance / Timetable / Inbox / Profile) but **no equivalent
"More" screen**, so principal-relevant features aren't reachable from one place.

## Goal

Add a principal "More / All features" grid screen, opened by tapping the avatar on
Principal Home — mirroring the teacher gesture. Teacher flow stays untouched.

## Approach

A standalone `PrincipalMoreScreen` reusing the teacher `MoreScreen` grid layout, with
its own principal item list. Each grid item declares its own navigation action, so we
avoid registering duplicate copies of screens that already live on other tabs.

Rejected alternatives:

- Extract a shared `FeatureGrid` component — more DRY but modifies the working teacher
  screen (added risk).
- Parameterize the existing `MoreScreen` — most coupling; one screen serving two roles
  and two nav types.

Chosen for lowest risk and consistency with the existing "keep principal separate"
principle.

## Grid items (11)

| Item             | Target                            | Navigation                         |
| ---------------- | --------------------------------- | ---------------------------------- |
| Broadcast        | `AnnouncementsScreen`             | local push (already in Home stack) |
| Live Bus         | `BusScreen`                       | local push                         |
| Teachers         | `TeacherDirectoryScreen`          | local push                         |
| Approvals        | `Approvals` tab                   | jump to tab                        |
| Staff Attendance | `PAttendance` tab                 | jump to tab                        |
| School Timetable | `PTimetable` tab                  | jump to tab                        |
| My Check-in      | `PProfile` → `MyAttendanceScreen` | jump to tab + nested screen        |
| Settings         | `PProfile` → `SettingsScreen`     | jump to tab + nested screen        |
| Payslip          | `PayslipScreen`                   | local push (newly registered)      |
| Leave            | `LeaveScreen`                     | local push (newly registered)      |
| Library          | `LibraryScreen`                   | local push (newly registered)      |

## Changes

1. **New** `src/screens/principal/PrincipalMoreScreen.tsx` — grid mirroring `MoreScreen`
   (2-up cards, colored icon tiles, `ScreenHeader title="More" subtitle="All features"`).
   Each item carries either a local stack screen name or a `{ tab, screen? }` target;
   the press handler dispatches accordingly.
2. **`src/navigation/types.ts`** — extend `PrincipalHomeStackParamList` with
   `PrincipalMoreScreen`, `PayslipScreen`, `LeaveScreen`, `LibraryScreen`.
3. **`src/navigation/PrincipalTabNavigator.tsx`** — register those four screens in
   `PrincipalHomeStackNavigator`.
4. **`src/screens/principal/PrincipalHomeScreen.tsx`** — wrap the header `Avatar` in a
   `TouchableOpacity` → `navigate('PrincipalMoreScreen')`.

## Out of scope

- No new feature screens (only reuse existing ones).
- Teacher flow / `MoreScreen` untouched.
- No shared-component refactor.

## Testing / verification

- App boots in principal mode; tapping the Home avatar opens the More grid.
- Each of the 11 cards navigates to the correct destination (local push or tab jump).
- Visual parity with the teacher More grid (2-up cards) at phone and desktop-web widths.
