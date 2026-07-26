# Principal Attendance Screen — Wording Alignment

## Context

`src/screens/principal/PrincipalAttendanceScreen.tsx` (Principal role's Attendance tab) has its own pre-existing, independently-built "present/total" summary per grade group, fed by `usePrincipalAttendance()` — a single atomic backend call (`GET /principal/attendance`) already verified in `docs/superpowers/audits/2026-07-24-live-data-findings.md` (rows 136-138) as real, backend-computed data, not fabricated or stubbed. This is unrelated to the `2026-07-26-attendance-screen-flow-design.md` work done on the teacher's `AttendancePickClassScreen.tsx` — different screen, different role, different data source.

Because `usePrincipalAttendance()` returns everything in one call, the whole screen already gates on a single loading spinner (`isLoading || !data` at `PrincipalAttendanceScreen.tsx:90`) before rendering any grade card — there is no per-card loading race here, so the teacher screen's "flash of 0 before real data arrives" bug cannot occur on this screen. No behavior change is needed here.

This is a small, cosmetic wording-consistency change only: two text changes, no new data, no new components.

## Changes

1. **Phrasing:** the grade card's count text at `PrincipalAttendanceScreen.tsx:135` currently reads `{g.present}/{g.total} present`. Change to `Present {g.present}/{g.total}`, matching the teacher screen's phrasing. The layout (this text on the left, bold `{g.pct}%` on the right, progress bar below) is unchanged — this screen's existing visual style (colored card, progress bar) stays exactly as-is; only the label wording changes.
2. **Zero-total wording:** when a grade has 0 total students (`g.total === 0`), the count/pct row currently renders `Present 0/0` and `0%`. Change to render `No students` in place of that row (both the count text and the `%`/progress-bar), matching the teacher screen's "No students" behavior for the same case. `g.pct` is already `0` (not `NaN`) in this case per the existing ternary at `PrincipalAttendanceScreen.tsx:72`, so this is a pure rendering branch — no calculation change.

## Out of scope

- No changes to `usePrincipalAttendance`, the backend, or any other part of the principal attendance flow (staff cards, section picker, school-total card).
- No visual/layout redesign — card color, progress bar, spacing all stay as they are today.
