# Attendance: Section Picker as a Full Page

## Context

The teacher's "Mark Attendance" flow (`AttendancePickClassScreen`) already shows only class (grade) cards up front, each with a "Present X/Y · Z%" summary. Today, tapping a grade card opens `SectionPickerModal` — a bottom-sheet popup — listing that grade's sections; tapping a section navigates to `AttendanceScreen` for the student roll-call.

This changes only the middle step: replace the bottom-sheet popup with a dedicated full page. Everything else in the flow (grade cards, their summary line, the student roll-call screen) is unchanged.

`SectionPickerModal` is not modified or removed — the Principal role's `PrincipalAttendanceScreen` uses the same component for its own section picker, and that screen is explicitly out of scope for this change.

## Navigation

A new route, `AttendancePickSection`, is added to `HomeStackParamList` with one param: `{ gradeName: string }`. `AttendancePickClassScreen`'s grade-card tap handler changes from opening the modal to `navigation.navigate('AttendancePickSection', { gradeName: g.name })`. Selecting a section on the new page navigates to the existing `AttendanceScreen` exactly as today (`navigation.navigate('AttendanceScreen', { classId })`).

## New screen: `AttendancePickSectionScreen`

Reads `gradeName` from its route param. Calls the existing `useClasses()` (already populated in the query cache from the previous screen, so this screen renders instantly with no loading flash) filtered to `c.name === gradeName`, and the existing `useSectionAttendanceSummaries()` hook to get each section's real student count (the same fix that replaced the backend's stubbed-always-0 `studentCount` field — this relocates that display, it does not reintroduce the bug).

Layout: a `ScreenHeader` with the grade name as the title, a back button, and a subtitle ("Choose a section"), followed by the same section-card visual (colored badge with the section letter, section label, real student-count subtitle) currently inside `SectionPickerModal`'s grid — reimplemented as normal scrollable page content, not a modal. No new visual language is introduced; this is the same cards in a page instead of a sheet.

Empty/error handling matches `AttendancePickClassScreen`'s existing conventions (spinner while loading, error text on failure).

## Out of scope

- `SectionPickerModal` itself: unchanged, still used by `PrincipalAttendanceScreen`.
- `AttendanceScreen` (the student roll-call/marking screen): unchanged.
- The grade card list and its Present/Total/% summary: unchanged.
- Any other entry point that skips the grade/section picker (e.g. `ClassesScreen`'s direct "Attendance" button): unchanged.
