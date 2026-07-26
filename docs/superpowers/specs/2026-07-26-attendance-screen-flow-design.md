# Attendance Screen Flow — Design

## Context

`sms-teacher-app` already implements a three-level attendance-marking flow: `AttendancePickClassScreen` (grade cards) → `SectionPickerModal` (bottom-sheet section picker) → `AttendanceScreen` (student roll-call, tap-to-cycle status, submit). This spec is an enhancement of that existing flow, not a rebuild — it closes three gaps against the desired behavior:

1. Grade cards show no attendance summary (just "N sections · tap to choose")
2. The section picker's per-section student count is always "0 students" (backend `studentCount` field is stubbed to always return 0 — a known gap, see `2026-07-24-live-data-findings.md`)
3. After a successful save, `AttendanceScreen` stays put and shows a toast; it doesn't return to the previous screen

No new screens are introduced.

## Card semantics

Cards on `AttendancePickClassScreen` remain grade-level (e.g. "Class I"), grouping all of that grade's sections. Tapping a card opens the existing `SectionPickerModal` bottom sheet listing sections (A, B, C…); selecting a section opens `AttendanceScreen` for that class+section. This matches the current architecture unchanged.

## Attendance summary calculation

Each grade card gains a summary line, e.g. **"Present 82/96 · 85%"**, computed client-side (no backend aggregate endpoint exists for this):

- **Total** = sum of real roster length per section, from `useStudentsByClass(sectionId)` — **not** the backend's `studentCount` field on the `Class` domain object, which is confirmed stubbed to always return 0.
- **Present** = sum of today's `'P'`-status attendance records per section, from `useAttendance(sectionId, today)`.
- A section with no attendance record yet today contributes 0 to Present but its roster still counts toward Total — an unmarked section pulls the grade's percentage down rather than being excluded, so the card reflects the whole grade's state honestly and nudges the teacher to finish marking remaining sections.
- **%** = `round(present / total * 100)`. If total is 0 (grade has no students in any section), show "No students" instead of a percentage.
- If a given section's roster or attendance fetch fails, exclude only that section from the sum (partial total) rather than failing the whole card.

This reuses the same per-section roster fetch to also fix `SectionPickerModal`'s subtitle — it changes from the stubbed `{studentCount} students` to the real fetched roster length. No component changes to `SectionPickerModal` itself; only the value passed in from `AttendancePickClassScreen` changes.

React Query already caches `useStudentsByClass`/`useAttendance` per class+date, and `useMarkAttendance`'s existing `onSettled` invalidation (which already invalidates the attendance query key on save) will automatically refresh the grade card's summary when the teacher returns to the picker screen — no new cache-invalidation logic is needed.

## UI changes

**`AttendancePickClassScreen` (grade cards):**

- Add a summary row per card showing Present/Total and %, alongside the existing "N sections · tap to choose" line.
- While the per-section queries for a card are still resolving, the summary shows a lightweight placeholder (e.g. "…") — the card remains tappable immediately, this is not a blocking loading state for the whole screen.

**`SectionPickerModal`:**

- No component/interface changes. The `subtitle` value passed per section changes from the stubbed student count to the real roster length (already computed for the card summary above, so this is free).

**`AttendanceScreen` (save flow):**

- On successful submit: show the existing success toast, then `navigation.goBack()` after ~1s so the teacher sees the confirmation before the screen returns to wherever they came from.
- On error: unchanged — error toast shown, screen stays, no navigation.
- Status cycle stays 4-state (Present → Absent → Late → Leave → Present); no reduction to 3 states.

## Out of scope

- Any backend changes (e.g. fixing the stubbed `studentCount` column) — this spec works entirely around that gap client-side.
- Changing entry points that skip the grade/section picker (e.g. `ClassesScreen`'s direct "Attendance" button, which opens `AttendanceScreen` for a known classId) — those continue to work exactly as today; `navigation.goBack()` after save returns to whichever screen the teacher came from, not specifically the picker.
