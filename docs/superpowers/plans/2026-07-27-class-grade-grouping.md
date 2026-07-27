# Fix Grade/Section Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop grouping "grade cards" by the backend's `Class.name` field (often the combined `"Grade-Section"` label like `"I-A"`) and instead group by the backend's separate `grade` field, so multiple sections of the same grade collapse into one card instead of rendering as separate single-section "grades".

**Architecture:** Add `grade: string` to the `Class` domain type and its zod mapper (a pure passthrough of a field `/v1/classes` already returns but the client currently drops). Add one shared helper, `classGroupKey`, to `src/lib/classLabel.ts` that returns `c.grade || c.name` — the single place the "prefer grade, fall back to name" rule lives. Three screens (`AttendancePickClassScreen`, `AttendancePickSectionScreen`, `PrincipalAttendanceScreen`) switch from grouping/filtering by `c.name` to `classGroupKey(c)`.

**Tech Stack:** React Native + TypeScript, zod, `@tanstack/react-query`, `@testing-library/react-native`, Jest.

## Global Constraints

- This is a client-only fix. `GET /v1/principal/attendance` still does not return `grade`/`section` directly (only `class_name`) — that gap is not fixed here. The Principal screen already cross-references `classById` (built from `/v1/classes`, which does have `grade`), so no backend change is needed for this plan's scope.
- No parsing/derivation of `grade` from `name` (e.g. splitting `"I-A"` into `"I"` + `"A"`) is introduced anywhere. When `grade` is unset (`''`), a class falls back to being grouped by its own `name` as its own single-section group — identical to today's behavior for that one class.
- `SectionPickerModal.tsx` is not modified — still consumed unchanged by `PrincipalAttendanceScreen` for its section popup.
- Existing tests that never set `grade` on a `Class` fixture must continue to pass unmodified — `grade` defaults to `''`, and `classGroupKey` falls back to `name` in that case, exactly matching current behavior.

---

### Task 1: Add `grade` to the `Class` domain type and its mapper

**Files:**

- Modify: `src/data/domain/index.ts`
- Modify: `src/data/http/mappers.ts`
- Test: `src/data/http/__tests__/mappers.test.ts`

**Interfaces:**

- Produces: `Class.grade: string` (domain type), `classSchema` parsing `grade` from the DTO, `toClass` mapping `d.grade ?? ''` — Task 2's `classGroupKey` helper and Task 3's screen changes consume this field.

- [ ] **Step 1: Write the failing test**

Add to `src/data/http/__tests__/mappers.test.ts`. Replace the import line:

```ts
import {
  studentSchema,
  toStudent,
  examPaperSchema,
  toExam,
  chatContactSchema,
  toChatContact,
  approvalRequestSchema,
  toApprovalRequest,
  leaveResponseSchema,
  toLeaveRequest,
  timetableSlotSchema,
  toTimetableSlot,
} from '../mappers';
```

with:

```ts
import {
  studentSchema,
  toStudent,
  examPaperSchema,
  toExam,
  chatContactSchema,
  toChatContact,
  approvalRequestSchema,
  toApprovalRequest,
  leaveResponseSchema,
  toLeaveRequest,
  timetableSlotSchema,
  toTimetableSlot,
  classSchema,
  toClass,
} from '../mappers';
```

Then append at the end of the file:

```ts
test('toClass reads the backend grade field separately from name', () => {
  const dto = classSchema.parse({
    id: 'c1',
    name: 'I-A',
    grade: 'I',
    section: 'A',
    subject: 'Math',
    room: '101',
  });
  const c = toClass(dto);
  expect(c.name).toBe('I-A');
  expect(c.grade).toBe('I');
  expect(c.section).toBe('A');
});

test('toClass defaults grade to an empty string when the backend omits it', () => {
  const dto = classSchema.parse({
    id: 'c1',
    name: 'C1',
    section: 'A',
    subject: 'Math',
    room: '101',
  });
  const c = toClass(dto);
  expect(c.grade).toBe('');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/data/http/__tests__/mappers.test.ts`
Expected: FAIL — `classSchema.parse` succeeds (unknown keys are ignored by default), but `c.grade` is `undefined`, not `'I'`/`''` — `expect(c.grade).toBe('I')` and `expect(c.grade).toBe('')` fail because `Class` doesn't have a `grade` field yet and `toClass` never sets one.

- [ ] **Step 3: Add `grade` to the `Class` domain type**

In `src/data/domain/index.ts`, replace:

```ts
export interface Class {
  id: string;
  name: string;
  section: string;
  subject: string;
  studentCount: number;
  room: string;
  nextPeriod?: string;
}
```

with:

```ts
export interface Class {
  id: string;
  name: string;
  /** The class's atomic grade (e.g. "I", "IX"), separate from `name` — some
   * backends populate `name` as the combined "Grade-Section" label instead
   * (e.g. "I-A"). Empty string when the backend has no grade set. */
  grade: string;
  section: string;
  subject: string;
  studentCount: number;
  room: string;
  nextPeriod?: string;
}
```

- [ ] **Step 4: Add `grade` to `classSchema` and `toClass`**

In `src/data/http/mappers.ts`, replace:

```ts
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string().nullish(),
  subject: z.string().nullish(),
  room: z.string().nullish(),
  student_count: z.number().nullish(),
  next_period: z.string().nullish(),
});
export type ClassDTO = z.infer<typeof classSchema>;
export const toClass = (d: ClassDTO): Class => ({
  id: d.id,
  name: d.name,
  section: d.section ?? '',
  subject: d.subject ?? '',
  studentCount: d.student_count ?? 0,
  room: d.room ?? '',
  nextPeriod: d.next_period ?? undefined,
});
```

with:

```ts
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string().nullish(),
  section: z.string().nullish(),
  subject: z.string().nullish(),
  room: z.string().nullish(),
  student_count: z.number().nullish(),
  next_period: z.string().nullish(),
});
export type ClassDTO = z.infer<typeof classSchema>;
export const toClass = (d: ClassDTO): Class => ({
  id: d.id,
  name: d.name,
  grade: d.grade ?? '',
  section: d.section ?? '',
  subject: d.subject ?? '',
  studentCount: d.student_count ?? 0,
  room: d.room ?? '',
  nextPeriod: d.next_period ?? undefined,
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/data/http/__tests__/mappers.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures. Jest transpiles TypeScript via `babel-preset-expo` (see `babel.config.js`) and does not type-check, so existing `Class` object literals in test files that don't yet set `grade` run fine at the JS level — TypeScript catches the missing property separately, in the next step.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: Compile errors — every `Class` object literal in existing test files (`AttendancePickClassScreen.test.tsx`, `AttendancePickSectionScreen.test.tsx`, `PrincipalAttendanceScreen.test.tsx`, and any others `tsc` reports) is now missing the required `grade` property. **Do not fix these in this task.** Record the exact list of files/lines `tsc` reports — Task 3 fixes the two Attendance screen test files and Task 4 fixes the Principal screen test file, as part of their own scope. If `tsc` reports any _other_ file with a bare `Class` literal missing `grade` that isn't one of those three, add a one-line note to your report identifying it, since it is out of this plan's explicit task list and needs a follow-up.

- [ ] **Step 8: Commit**

```bash
git add src/data/domain/index.ts src/data/http/mappers.ts src/data/http/__tests__/mappers.test.ts
git commit -m "feat(data): parse the backend's grade field onto Class, separate from name"
```

---

### Task 2: Add the `classGroupKey` helper

**Files:**

- Modify: `src/lib/classLabel.ts`
- Test: `src/lib/__tests__/classLabel.test.ts`

**Interfaces:**

- Consumes: nothing beyond a `{ grade: string; name: string }`-shaped object (structurally compatible with Task 1's `Class`, but intentionally not importing the `Class` type — this keeps the helper a pure, dependency-free string utility like its siblings `gradeLabel`/`sectionLabel`).
- Produces: `classGroupKey(c: { grade: string; name: string }): string` exported from `@/lib/classLabel` — Task 3's three screen changes call this.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/classLabel.test.ts`. Replace the import line:

```ts
import { classLabel, gradeLabel, sectionLabel } from '../classLabel';
```

with:

```ts
import { classLabel, gradeLabel, sectionLabel, classGroupKey } from '../classLabel';
```

Then append at the end of the file:

```ts
test('classGroupKey prefers grade over name when grade is set', () => {
  expect(classGroupKey({ grade: 'I', name: 'I-A' })).toBe('I');
});

test('classGroupKey falls back to name when grade is empty', () => {
  expect(classGroupKey({ grade: '', name: 'C1' })).toBe('C1');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/__tests__/classLabel.test.ts`
Expected: FAIL — `classGroupKey` is not exported from `../classLabel`.

- [ ] **Step 3: Add `classGroupKey` to `classLabel.ts`**

Append to `src/lib/classLabel.ts`:

```ts
/** Prefer the atomic `grade` field for grouping classes into "grade cards";
 * fall back to `name` when a class has no grade set (e.g. legacy/free-text
 * names like "C1" or "Homeroom"), matching that class into its own group. */
export function classGroupKey(c: { grade: string; name: string }): string {
  return c.grade || c.name;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/__tests__/classLabel.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: same set of pre-existing errors as Task 1 left behind (missing `grade` on `Class` literals in the three screen test files) — no _new_ errors introduced by this task's own files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/classLabel.ts src/lib/__tests__/classLabel.test.ts
git commit -m "feat(lib): add classGroupKey, preferring grade over name for grouping"
```

---

### Task 3: Switch `AttendancePickClassScreen` and `AttendancePickSectionScreen` to `classGroupKey`

**Files:**

- Modify: `src/screens/AttendancePickClassScreen.tsx`
- Modify: `src/screens/AttendancePickSectionScreen.tsx`
- Modify: `src/screens/__tests__/AttendancePickClassScreen.test.tsx`
- Modify: `src/screens/__tests__/AttendancePickSectionScreen.test.tsx`

**Interfaces:**

- Consumes: `classGroupKey` from Task 2's `@/lib/classLabel`; `Class.grade` from Task 1.
- Produces: no new exported interface — the `gradeName` route param's value is now a corrected group key (same param name/shape as before).

- [ ] **Step 1: Add `grade` to every `Class` object literal in both test files**

In `src/screens/__tests__/AttendancePickClassScreen.test.tsx`, replace:

```ts
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };
  // c1 already marked (both present); c2 not marked yet today.
  const attendance: Record<string, AttendanceRecord[]> = {
    c1: [
      { studentId: 'c1-s0', status: 'P', date: '2026-07-26' },
      { studentId: 'c1-s1', status: 'P', date: '2026-07-26' },
    ],
    c2: [],
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: {
      forClass: jest.fn(async (classId: string) => attendance[classId] ?? []),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  // Total = 2 + 3 = 5, Present = 2 + 0 = 2, pct = round(2/5*100) = 40.
  await waitFor(() => expect(screen.getByText('Present 2/5 · 40%')).toBeTruthy());

  fireEvent.press(screen.getByText('IV'));

  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', { gradeName: 'IV' });
});
```

with:

```ts
  const classes: Class[] = [
    { id: 'c1', name: 'IV', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', grade: '', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };
  // c1 already marked (both present); c2 not marked yet today.
  const attendance: Record<string, AttendanceRecord[]> = {
    c1: [
      { studentId: 'c1-s0', status: 'P', date: '2026-07-26' },
      { studentId: 'c1-s1', status: 'P', date: '2026-07-26' },
    ],
    c2: [],
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: {
      forClass: jest.fn(async (classId: string) => attendance[classId] ?? []),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  // Total = 2 + 3 = 5, Present = 2 + 0 = 2, pct = round(2/5*100) = 40.
  await waitFor(() => expect(screen.getByText('Present 2/5 · 40%')).toBeTruthy());

  fireEvent.press(screen.getByText('IV'));

  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', { gradeName: 'IV' });
});

test('groups two classes that share a grade but have different names into one grade card', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'I-A', grade: 'I', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'I-B', grade: 'I', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  // A single "I" grade card renders (not two "I-A"/"I-B" cards), aggregating
  // both sections: total = 2 + 3 = 5.
  await waitFor(() => expect(screen.getByText('Present 0/5 · 0%')).toBeTruthy());
  expect(screen.queryByText('I-A')).toBeNull();
  expect(screen.queryByText('I-B')).toBeNull();

  fireEvent.press(screen.getByText('I'));

  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', { gradeName: 'I' });
});
```

Replace:

```ts
test('excludes a section from the aggregate (not counted as unmarked) when its attendance fetch fails', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
```

with:

```ts
test('excludes a section from the aggregate (not counted as unmarked) when its attendance fetch fails', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', grade: '', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
  ];
```

Replace:

```ts
test('shows "No students" when a grade has no students in any section', async () => {
  const classes: Class[] = [
    { id: 'c3', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
```

with:

```ts
test('shows "No students" when a grade has no students in any section', async () => {
  const classes: Class[] = [
    { id: 'c3', name: 'V', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
```

In `src/screens/__tests__/AttendancePickSectionScreen.test.tsx`, replace:

```ts
test("shows only the requested grade's sections with real (non-zero) student counts, and navigates to AttendanceScreen on tap", async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
    { id: 'c2', name: 'IV', section: 'B', subject: 'Math', studentCount: 0, room: '102' },
    { id: 'c3', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  // Only IV's sections (A, B) render — V's section is excluded.
  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
  expect(screen.getByText('3 students')).toBeTruthy();
  expect(screen.getByText('Section A')).toBeTruthy();
  expect(screen.getByText('Section B')).toBeTruthy();

  fireEvent.press(screen.getByText('Section A'));
  expect(mockNavigate).toHaveBeenCalledWith('AttendanceScreen', { classId: 'c1' });
});
```

with:

```ts
test("shows only the requested grade's sections with real (non-zero) student counts, and navigates to AttendanceScreen on tap", async () => {
  const classes: Class[] = [
    {
      id: 'c1',
      name: 'IV',
      grade: '',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
    {
      id: 'c2',
      name: 'IV',
      grade: '',
      section: 'B',
      subject: 'Math',
      studentCount: 0,
      room: '102',
    },
    { id: 'c3', name: 'V', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  // Only IV's sections (A, B) render — V's section is excluded.
  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
  expect(screen.getByText('3 students')).toBeTruthy();
  expect(screen.getByText('Section A')).toBeTruthy();
  expect(screen.getByText('Section B')).toBeTruthy();

  fireEvent.press(screen.getByText('Section A'));
  expect(mockNavigate).toHaveBeenCalledWith('AttendanceScreen', { classId: 'c1' });
});

test("selects classes by the grade route param, not by name, when a class's name differs from its grade", async () => {
  mockGradeName = 'I';
  const classes: Class[] = [
    {
      id: 'c1',
      name: 'I-A',
      grade: 'I',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
    {
      id: 'c2',
      name: 'I-B',
      grade: 'I',
      section: 'B',
      subject: 'Math',
      studentCount: 0,
      room: '102',
    },
    {
      id: 'c3',
      name: 'II-A',
      grade: 'II',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '103',
    },
  ];
  const rosters: Record<string, Student[]> = {
    c1: makeStudents(2, 'c1'),
    c2: makeStudents(3, 'c2'),
  };

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async (classId: string) => ({
        items: rosters[classId] ?? [],
        nextCursor: null,
      })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  // Both grade-I sections (c1, c2) render; grade-II's c3 is excluded.
  await waitFor(() => expect(screen.getByText('Section A')).toBeTruthy());
  expect(screen.getByText('Section B')).toBeTruthy();
  expect(screen.getByText('2 students')).toBeTruthy();
  expect(screen.getByText('3 students')).toBeTruthy();

  fireEvent.press(screen.getByText('Section A'));
  expect(mockNavigate).toHaveBeenCalledWith('AttendanceScreen', { classId: 'c1' });
});
```

Replace:

```ts
test('does not show "0 students" while summaries are still loading', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  ];
```

with:

```ts
test('does not show "0 students" while summaries are still loading', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  ];
```

- [ ] **Step 2: Run the tests to verify the new ones fail, and the untouched ones still pass**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx src/screens/__tests__/AttendancePickSectionScreen.test.tsx`
Expected: FAIL — only the two new tests fail (grouping/filtering still uses `c.name`, so grade `'I'` classes with names `'I-A'`/`'I-B'` render as two separate cards/are not matched by `gradeName: 'I'`); all other tests in both files still PASS unmodified.

- [ ] **Step 3: Update `AttendancePickClassScreen.tsx` to group by `classGroupKey`**

Replace:

```tsx
import { gradeLabel } from '@/lib/classLabel';
```

with:

```tsx
import { gradeLabel, classGroupKey } from '@/lib/classLabel';
```

Replace:

```tsx
// Group classes by grade name so the user picks a class, then a section
// (on a dedicated page — see AttendancePickSectionScreen).
const grades = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, { id: string; section: string }[]>();
  for (const c of classes) {
    const arr = map.get(c.name) ?? [];
    arr.push({ id: c.id, section: c.section });
    map.set(c.name, arr);
  }
  return [...map.entries()].map(([name, sections]) => ({ name, sections }));
}, [classes]);
```

with:

```tsx
// Group classes by their grade (falling back to name when a class has no
// grade set) so the user picks a class, then a section (on a dedicated
// page — see AttendancePickSectionScreen).
const grades = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, { id: string; section: string }[]>();
  for (const c of classes) {
    const key = classGroupKey(c);
    const arr = map.get(key) ?? [];
    arr.push({ id: c.id, section: c.section });
    map.set(key, arr);
  }
  return [...map.entries()].map(([name, sections]) => ({ name, sections }));
}, [classes]);
```

- [ ] **Step 4: Update `AttendancePickSectionScreen.tsx` to filter by `classGroupKey`**

Replace:

```tsx
import { gradeLabel, sectionLabel } from '@/lib/classLabel';
```

with:

```tsx
import { gradeLabel, sectionLabel, classGroupKey } from '@/lib/classLabel';
```

Replace:

```tsx
const sections = useMemo(() => classes.filter((c) => c.name === gradeName), [classes, gradeName]);
```

with:

```tsx
const sections = useMemo(
  () => classes.filter((c) => classGroupKey(c) === gradeName),
  [classes, gradeName]
);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx src/screens/__tests__/AttendancePickSectionScreen.test.tsx`
Expected: PASS (all tests in both files)

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: same pre-existing errors as before this task for `PrincipalAttendanceScreen.test.tsx` only (Task 4 fixes that file) — zero errors remaining for the two files this task touches, and zero _new_ errors anywhere else.

- [ ] **Step 8: Commit**

```bash
git add src/screens/AttendancePickClassScreen.tsx src/screens/AttendancePickSectionScreen.tsx src/screens/__tests__/AttendancePickClassScreen.test.tsx src/screens/__tests__/AttendancePickSectionScreen.test.tsx
git commit -m "fix(attendance): group/filter classes by grade instead of name"
```

---

### Task 4: Switch `PrincipalAttendanceScreen` to `classGroupKey`

**Files:**

- Modify: `src/screens/principal/PrincipalAttendanceScreen.tsx`
- Modify: `src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`

**Interfaces:**

- Consumes: `classGroupKey` from Task 2's `@/lib/classLabel`.
- Produces: no new exported interface — only the grouping key used internally changes.

- [ ] **Step 1: Add `grade` to the test file's `Class` literals, and add a new grouping test**

In `src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`, replace:

```ts
const classList: Class[] = [
  { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  { id: 'c2', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '102' },
  { id: 'c3', name: 'VI', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
];
```

with:

```ts
const classList: Class[] = [
  { id: 'c1', name: 'IV', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  { id: 'c2', name: 'V', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '102' },
  { id: 'c3', name: 'VI', grade: '', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
];
```

Then append at the end of the file (after the existing test):

```ts
test('groups two classes that share a grade but have different names into one grade card', async () => {
  const gradedClassList: Class[] = [
    {
      id: 'c1',
      name: 'I-A',
      grade: 'I',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
    {
      id: 'c2',
      name: 'I-B',
      grade: 'I',
      section: 'B',
      subject: 'Math',
      studentCount: 0,
      room: '102',
    },
  ];
  const gradedAttendance: SchoolAttendance = {
    date: '2026-07-26',
    presentTotal: 5,
    studentTotal: 5,
    overallPct: 100,
    classes: [
      { classId: 'c1', className: 'I-A', present: 2, total: 2, pct: 100 },
      { classId: 'c2', className: 'I-B', present: 3, total: 3, pct: 100 },
    ],
    staff: [],
  };

  const repos = {
    principal: { attendance: jest.fn(async () => gradedAttendance) },
    classes: { list: jest.fn(async () => gradedClassList) },
  } as unknown as Repositories;

  renderScreen(repos);

  // A single "I" grade card renders, aggregating both sections: total = 2 + 3 = 5.
  await waitFor(() => expect(screen.getByText('Present 5/5')).toBeTruthy());
  expect(screen.queryByText('I-A')).toBeNull();
  expect(screen.queryByText('I-B')).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify the new one fails, and the existing one still passes**

Run: `npx jest src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`
Expected: FAIL — only the new test fails (grouping still uses `.name`, so `c1`/`c2` render as two separate `"I-A"`/`"I-B"` cards, not one aggregated `"I"` card); the existing test still PASSES unmodified.

- [ ] **Step 3: Update `PrincipalAttendanceScreen.tsx` to group by `classGroupKey`**

Replace:

```tsx
import { gradeLabel } from '@/lib/classLabel';
```

with:

```tsx
import { gradeLabel, classGroupKey } from '@/lib/classLabel';
```

Replace:

```tsx
// Group the per-section attendance into grades so the principal picks a
// class, then a section (via popup), before opening that section's attendance.
const gradeGroups = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, GradeGroup>();
  for (const c of data?.classes ?? []) {
    const name = classById[c.classId]?.name ?? c.className;
    const g = map.get(name) ?? { name, present: 0, total: 0, pct: 0, options: [] };
    g.present += c.present;
    g.total += c.total;
    g.options.push({
      id: c.classId,
      section: classById[c.classId]?.section ?? '?',
      subtitle: `${c.pct}% present`,
    });
    map.set(name, g);
  }
  return [...map.values()].map((g) => ({
    ...g,
    pct: g.total ? Math.round((g.present / g.total) * 100) : 0,
  }));
}, [data, classById]);
```

with:

```tsx
// Group the per-section attendance into grades so the principal picks a
// class, then a section (via popup), before opening that section's attendance.
const gradeGroups = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, GradeGroup>();
  for (const c of data?.classes ?? []) {
    const cls = classById[c.classId];
    const name = cls ? classGroupKey(cls) : c.className;
    const g = map.get(name) ?? { name, present: 0, total: 0, pct: 0, options: [] };
    g.present += c.present;
    g.total += c.total;
    g.options.push({
      id: c.classId,
      section: cls?.section ?? '?',
      subtitle: `${c.pct}% present`,
    });
    map.set(name, g);
  }
  return [...map.values()].map((g) => ({
    ...g,
    pct: g.total ? Math.round((g.present / g.total) * 100) : 0,
  }));
}, [data, classById]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project (this was the last file left with a pre-existing error from Task 1)

- [ ] **Step 7: Commit**

```bash
git add src/screens/principal/PrincipalAttendanceScreen.tsx src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx
git commit -m "fix(principal): group attendance classes by grade instead of name"
```

---

### Task 5: Manual verification

**Files:**

- None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS, all tests including every new/modified test from Tasks 1-4

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test (if a running app/simulator is available)**

- Open the teacher's Attendance tab against a backend/dataset where multiple classes share a `grade` but have distinct `name`s (e.g. `"I-A"`/`grade "I"`, `"I-B"`/`grade "I"`): confirm one "I" grade card renders (not two), and tapping it shows both sections A and B on the new section page.
- Open the Principal's Attendance tab against the same dataset: confirm the same grouping — one "I" card aggregating both sections' Present/Total/%, not two separate single-section cards.
- Confirm a class with no `grade` set still renders as its own single-section card keyed by its `name`, unchanged from today.

- [ ] **Step 4: Report back to user**

Confirm the grade/section grouping bug (grade cards splitting into one-per-section) is fixed on both the teacher and Principal Attendance screens, confirm test/typecheck results, and note that the `GET /v1/principal/attendance` backend gap (no direct `grade`/`section` fields) remains open as a follow-up, not fixed in this plan.
