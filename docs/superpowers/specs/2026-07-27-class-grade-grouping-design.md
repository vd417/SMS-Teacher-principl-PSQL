# Fix Grade/Section Grouping to Use the Backend's `grade` Field

## Context

The backend's `Classes` table has three separate columns: `Name`, `Grade`, and `Section`. By convention across the codebase, `Name` is very often populated as the combined `"Grade-Section"` label (e.g. `"I-A"`, `"IX-B"`), while `Grade` (`"I"`, `"IX"`) and `Section` (`"A"`, `"B"`) hold the true atomic values. `GET /v1/classes` already returns `grade` as its own JSON field alongside `name` and `section`.

The mobile app's `classSchema`/`Class` domain type never parses `grade` at all — only `name` and `section` are read. Every screen that groups classes into "grade cards" groups by `name` instead:

- `AttendancePickClassScreen.tsx` (teacher) groups classes by `c.name` to build grade cards, then (via the new `AttendancePickSectionScreen`) filters by `c.name === gradeName` to list that grade's sections.
- `PrincipalAttendanceScreen.tsx` groups by `classById[c.classId]?.name ?? c.className` for the same purpose.

Because `name` is frequently the combined `"Grade-Section"` string rather than the grade alone, grouping by it produces one card per section instead of one card per grade with multiple sections — confirmed live: a school's "I-A", "I-B", "I-C" classes render as three separate single-section "grade" cards instead of one "I" card with three sections.

This fix is client-only. `GET /v1/principal/attendance` itself doesn't return `grade`/`section` (only `class_name`) — that's a separate backend gap, tracked but not fixed here. The Principal screen already cross-references `classById` (built from `/v1/classes`, which does have `grade`), so this fix covers it without any backend change.

## Data layer

Add `grade: string` to the `Class` domain type (`src/data/domain/index.ts`) and its mapper (`src/data/http/mappers.ts`), parsed the same way `section` already is: `grade: d.grade ?? ''`. This is a pure passthrough of a field the backend already sends — no derivation or parsing logic in the mapper.

Since `grade` defaults to `''` when absent, and no existing test fixture sets it, every existing `Class` object built in tests continues to behave exactly as it does today (see "Fallback rule" below) — this change alone doesn't break any existing test.

## Fallback rule: `classGroupKey`

Add one exported helper to `src/lib/classLabel.ts`, alongside the existing `gradeLabel`/`sectionLabel` helpers:

```ts
export function classGroupKey(c: { grade: string; name: string }): string {
  return c.grade || c.name;
}
```

This is the single place that decides "prefer the atomic `grade` field; fall back to `name` when `grade` is unset" (covering legacy/free-text class names like `"C1"` or `"Homeroom"` that were never assigned a `grade`). Every grouping call site uses this helper instead of reading `c.name` directly, so the fallback rule lives in exactly one place.

## Consumers

Three call sites switch from grouping/filtering by `c.name` to `classGroupKey(c)`:

1. **`AttendancePickClassScreen.tsx`** — the `grades` `useMemo` groups classes by `classGroupKey(c)` instead of `c.name`. The grouped key is passed as the `gradeName` route param to `AttendancePickSection` exactly as today (same param name and shape — its value is now the corrected group key, e.g. `"I"` instead of `"I-A"`). The card's displayed title still runs through `gradeLabel(...)` on that key, unchanged.

2. **`AttendancePickSectionScreen.tsx`** — filters `classes.filter(c => classGroupKey(c) === gradeName)` instead of `c.name === gradeName`, so the sections shown for a given grade route param are the ones sharing that `grade` (or, for ungraded classes, sharing that exact `name`).

3. **`PrincipalAttendanceScreen.tsx`** — the `gradeGroups` `useMemo` groups by `classById[c.classId] ? classGroupKey(classById[c.classId]!) : c.className` instead of `classById[c.classId]?.name ?? c.className`. When the class is present in `classById` (the common case), grouping uses the corrected key; the `c.className` fallback (from the attendance summary itself, when the class isn't in `classById` for some reason) is preserved unchanged from today's behavior.

No other files change. `SectionPickerModal` (still used by the Principal screen for its section popup) is unaffected — it renders whatever `sections` array it's given, unchanged.

## Testing

- `src/lib/__tests__/classLabel.test.ts`: add tests for `classGroupKey` — returns `grade` when set, falls back to `name` when `grade` is `''`/absent.
- `src/screens/__tests__/AttendancePickClassScreen.test.tsx`: add a test with two classes sharing a `grade` (`grade: 'I', name: 'I-A'` and `grade: 'I', name: 'I-B'`) and confirm they render as one grade card, not two — the regression test for the actual bug. Existing tests (which never set `grade`) are unchanged and must continue passing unmodified, proving the fallback preserves current behavior.
- `src/screens/__tests__/AttendancePickSectionScreen.test.tsx`: add a test where the route's `gradeName` is a `grade` value (not a `name`) and confirm it selects classes by `grade`, not `name`.
- `src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`: add a test with two classes sharing a `grade` but different `name`s, confirming the Principal's grade cards group them together too.

## Out of scope

- The `GET /v1/principal/attendance` backend endpoint not returning `grade`/`section` directly — tracked as a follow-up, not fixed here, since the Principal screen's existing `classById` cross-reference makes it unnecessary for this fix.
- Any parsing/derivation of `grade` from `name` when `grade` is unset (e.g. splitting `"I-A"` into `"I"` + `"A"`) — explicitly rejected per design discussion; an unset `grade` falls back to grouping by the class's own `name` as its own single-section group, matching today's behavior for that one class.
- `SectionPickerModal.tsx` itself — unchanged, still consumed by `PrincipalAttendanceScreen` for its section popup.
