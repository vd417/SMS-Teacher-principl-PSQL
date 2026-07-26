# Attendance Screen Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Present/Total/% attendance summary to each grade card, fix the section picker's student-count subtitle (currently always "0 students"), and auto-return to the previous screen after a successful attendance save.

**Architecture:** Pure aggregation logic lives in a new `gradeSummary.ts` module (unit-tested in isolation). A new `useSectionAttendanceSummaries` hook fetches every visible section's roster + today's attendance in parallel (`useQueries`) and returns a per-section `{total, present}` map; `AttendancePickClassScreen` combines that map with `aggregateSections` to render each grade card's summary and to fix the section-picker subtitle. `AttendanceScreen` gets a plain `setTimeout`-based auto-navigate-back on successful save, decoupled from the Toast component's own animation timing. No new screens; no backend changes.

**Tech Stack:** React Native + TypeScript, `@tanstack/react-query` (incl. `useQueries`), `@testing-library/react-native`, Jest (`jest-expo` preset).

## Global Constraints

- Total (per section) = real roster length from `repos.students.listByClass`, **not** the `Class.studentCount` field (confirmed stubbed to always return 0 on the backend).
- Present (per section) = count of today's `'P'`-status records from `repos.attendance.forClass`.
- An unmarked section contributes its full roster to the grade's Total but 0 to Present — it pulls the percentage down rather than being excluded.
- Grade `%` = `round(present / total * 100)`; show "No students" instead of a percentage when a grade's Total is 0.
- Grade cards stay grade-level (e.g. "Class I"); tapping still opens the existing `SectionPickerModal` bottom sheet. No new screens.
- Attendance status cycle stays 4-state: Present → Absent → Late → Leave → Present. Do not reduce to 3 states.
- On successful save: show the existing success toast, then `navigation.goBack()` after 1000ms. On error: unchanged (error toast, stay on screen, no navigation).
- No backend changes in this plan.

---

### Task 1: Grade attendance aggregation helpers

**Files:**

- Create: `src/features/attendance/gradeSummary.ts`
- Test: `src/features/attendance/__tests__/gradeSummary.test.ts`

**Interfaces:**

- Produces: `SectionAttendance { total: number; present: number }`, `GradeAttendanceSummary { present: number; total: number; pct: number | null }`, `countPresent(records: AttendanceRecord[] | undefined): number`, `aggregateSections(sections: SectionAttendance[]): GradeAttendanceSummary` — Task 2 and Task 3 both import these.

- [ ] **Step 1: Write the failing tests**

Create `src/features/attendance/__tests__/gradeSummary.test.ts`:

```ts
import { countPresent, aggregateSections } from '../gradeSummary';
import type { AttendanceRecord } from '@/data/domain';

describe('countPresent', () => {
  test('counts only P-status records', () => {
    const records: AttendanceRecord[] = [
      { studentId: 's1', status: 'P', date: '2026-07-26' },
      { studentId: 's2', status: 'A', date: '2026-07-26' },
      { studentId: 's3', status: 'P', date: '2026-07-26' },
      { studentId: 's4', status: 'L', date: '2026-07-26' },
    ];
    expect(countPresent(records)).toBe(2);
  });

  test('returns 0 for undefined (section not marked yet)', () => {
    expect(countPresent(undefined)).toBe(0);
  });

  test('returns 0 for an empty array', () => {
    expect(countPresent([])).toBe(0);
  });
});

describe('aggregateSections', () => {
  test('sums present and total across sections', () => {
    const result = aggregateSections([
      { total: 30, present: 28 },
      { total: 32, present: 30 },
    ]);
    expect(result).toEqual({ present: 58, total: 62, pct: 94 });
  });

  test('an unmarked section (present: 0) still counts its roster toward total', () => {
    const result = aggregateSections([
      { total: 30, present: 28 }, // marked
      { total: 32, present: 0 }, // not marked yet today
    ]);
    expect(result).toEqual({ present: 28, total: 62, pct: 45 });
  });

  test('rounds the percentage', () => {
    const result = aggregateSections([{ total: 3, present: 1 }]);
    expect(result.pct).toBe(33);
  });

  test('pct is null when there are no students in any section', () => {
    const result = aggregateSections([{ total: 0, present: 0 }]);
    expect(result.pct).toBeNull();
  });

  test('handles an empty sections array', () => {
    expect(aggregateSections([])).toEqual({ present: 0, total: 0, pct: null });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/attendance/__tests__/gradeSummary.test.ts`
Expected: FAIL — `Cannot find module '../gradeSummary'`

- [ ] **Step 3: Implement the module**

Create `src/features/attendance/gradeSummary.ts`:

```ts
import type { AttendanceRecord } from '@/data/domain';

export interface SectionAttendance {
  total: number;
  present: number;
}

export interface GradeAttendanceSummary {
  present: number;
  total: number;
  /** Percentage 0-100, rounded. null when the grade has no students in any section. */
  pct: number | null;
}

/** Counts 'P' (Present) records; unmarked/undefined records count as 0. */
export function countPresent(records: AttendanceRecord[] | undefined): number {
  return records?.filter((r) => r.status === 'P').length ?? 0;
}

/**
 * Sums per-section totals into a grade-level summary. A section that hasn't
 * been marked yet today still contributes its full roster to `total` (with 0
 * `present`), so an unmarked section pulls the grade's percentage down rather
 * than being excluded from the count.
 */
export function aggregateSections(sections: SectionAttendance[]): GradeAttendanceSummary {
  const total = sections.reduce((sum, s) => sum + s.total, 0);
  const present = sections.reduce((sum, s) => sum + s.present, 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : null;
  return { present, total, pct };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/attendance/__tests__/gradeSummary.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/gradeSummary.ts src/features/attendance/__tests__/gradeSummary.test.ts
git commit -m "feat(attendance): add grade attendance aggregation helpers"
```

---

### Task 2: `useSectionAttendanceSummaries` hook

**Files:**

- Modify: `src/features/attendance/hooks.ts`

**Interfaces:**

- Consumes: `SectionAttendance`, `countPresent` from Task 1's `./gradeSummary`; existing `queryKeys.studentsByClass`, `queryKeys.attendance` from `@/lib/queryClient`; `repos.students.listByClass(classId, {limit})`, `repos.attendance.forClass(classId, date)` from `Repositories`.
- Produces: `useSectionAttendanceSummaries(classIds: string[], date: string): { bySection: Record<string, SectionAttendance>; isLoading: boolean }` — Task 3 imports this.

This hook has no dedicated unit test file — it's a thin data-orchestration layer over `useQueries`, and this codebase's convention (see `src/features/auth/__tests__/AuthProvider.test.tsx`) is to exercise data-fetching hooks through the screen that consumes them rather than in isolation. Task 3's screen test exercises this hook directly (asserting the grade summary and the section subtitle it computes).

- [ ] **Step 1: Add the hook**

Modify `src/features/attendance/hooks.ts` — change the import line and append the new hook after `useAttendance`:

Replace:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { AttendanceRecord } from '@/data/domain';
```

with:

```ts
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { AttendanceRecord } from '@/data/domain';
import { countPresent, type SectionAttendance } from './gradeSummary';
```

Then, immediately after the closing brace of `useAttendance` (before `export function useMarkAttendance`), insert:

```ts
export interface SectionAttendanceSummaries {
  /** Per-section {total, present}, keyed by classId. */
  bySection: Record<string, SectionAttendance>;
  isLoading: boolean;
}

/**
 * Fetches each section's roster + today's attendance in parallel and returns
 * a per-section {total, present} map keyed by classId. Screens combine these
 * with `aggregateSections` (see gradeSummary.ts) to get a grade-level summary.
 */
export function useSectionAttendanceSummaries(
  classIds: string[],
  date: string
): SectionAttendanceSummaries {
  const repos = useRepositories();
  const tenantId = useTenantId();

  const rosterResults = useQueries({
    queries: classIds.map((id) => ({
      queryKey: queryKeys.studentsByClass(tenantId, id),
      queryFn: () => repos.students.listByClass(id, { limit: 200 }),
      enabled: id !== '',
    })),
  });

  const attendanceResults = useQueries({
    queries: classIds.map((id) => ({
      queryKey: queryKeys.attendance(tenantId, id, date),
      queryFn: () => repos.attendance.forClass(id, date),
      enabled: id !== '' && date !== '',
    })),
  });

  const isLoading =
    rosterResults.some((r) => r.isLoading) || attendanceResults.some((r) => r.isLoading);

  const bySection: Record<string, SectionAttendance> = {};
  classIds.forEach((id, i) => {
    const roster = rosterResults[i]?.data?.items ?? [];
    const records = attendanceResults[i]?.data;
    bySection[id] = { total: roster.length, present: countPresent(records) };
  });

  return { bySection, isLoading };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/features/attendance/hooks.ts`

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance/hooks.ts
git commit -m "feat(attendance): add useSectionAttendanceSummaries hook"
```

---

### Task 3: Grade card summary + real section counts on `AttendancePickClassScreen`

**Files:**

- Modify: `src/screens/AttendancePickClassScreen.tsx`
- Test: `src/screens/__tests__/AttendancePickClassScreen.test.tsx`

**Interfaces:**

- Consumes: `useSectionAttendanceSummaries` and `SectionAttendance` from Task 2 (`@/features/attendance/hooks`); `aggregateSections` from Task 1 (`@/features/attendance/gradeSummary`).
- Produces: updated `AttendancePickClassScreen` — no exported interface changes (default screen export unchanged).

- [ ] **Step 1: Write the failing test**

Create `src/screens/__tests__/AttendancePickClassScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { AttendancePickClassScreen } from '../AttendancePickClassScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, Student, AttendanceRecord } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string }) => ReactLib.createElement(Text, null, `icon:${props.name}`),
  };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

function makeStudents(n: number, classId: string): Student[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${classId}-s${i}`,
    name: `Student ${i}`,
    roll: `${i + 1}`,
    initials: 'ST',
    classId,
    attendance: 0,
    grade: 'IV',
    parent: '',
    parentPhone: '',
    photoUrl: null,
  }));
}

function renderScreen(repos: Repositories) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repositories={repos}>
          <AuthProvider>
            <AttendancePickClassScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test("shows a Present/Total/% summary aggregated across a grade's sections, and real (non-zero) student counts in the section picker", async () => {
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

  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
  expect(screen.getByText('3 students')).toBeTruthy();
});

test('shows "No students" when a grade has no students in any section', async () => {
  const classes: Class[] = [
    { id: 'c3', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '103' },
  ];
  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(async () => ({ items: [], nextCursor: null })),
    },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('No students')).toBeTruthy());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx`
Expected: FAIL — no "Present 2/5 · 40%" text found (current screen has no summary line, and section subtitles read "0 students").

- [ ] **Step 3: Implement the screen changes**

Modify `src/screens/AttendancePickClassScreen.tsx`.

Replace the import block:

```tsx
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
```

with:

```tsx
import { useClasses } from '@/features/classes/hooks';
import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';
import { aggregateSections } from '@/features/attendance/gradeSummary';
import { deriveColorSet } from '@/theme/derive';
```

Replace the component body from the `useClasses`/`useState` lines through the end of the `grades` `useMemo` and the `openAttendance` function:

```tsx
const { data: classes = [], isLoading, isError } = useClasses();
const [picker, setPicker] = useState<GradeGroup | null>(null);

// Group classes by grade name so the user picks a class, then a section.
const grades = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, SectionOption[]>();
  for (const c of classes) {
    const arr = map.get(c.name) ?? [];
    arr.push({ id: c.id, section: c.section, subtitle: `${c.studentCount} students` });
    map.set(c.name, arr);
  }
  return [...map.entries()].map(([name, sections]) => ({ name, sections }));
}, [classes]);

const openAttendance = (classId: string) => {
  setPicker(null);
  navigation.navigate('AttendanceScreen', { classId });
};
```

with:

```tsx
const today = todayISO();
const { data: classes = [], isLoading, isError } = useClasses();
const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
  classes.map((c) => c.id),
  today
);
const [pickerGradeName, setPickerGradeName] = useState<string | null>(null);

// Group classes by grade name so the user picks a class, then a section.
// Section subtitles use the real fetched roster count, not the backend's
// Class.studentCount field (confirmed stubbed to always return 0).
const grades = useMemo<GradeGroup[]>(() => {
  const map = new Map<string, SectionOption[]>();
  for (const c of classes) {
    const arr = map.get(c.name) ?? [];
    const total = bySection[c.id]?.total;
    arr.push({
      id: c.id,
      section: c.section,
      subtitle: total !== undefined ? `${total} student${total === 1 ? '' : 's'}` : undefined,
    });
    map.set(c.name, arr);
  }
  return [...map.entries()].map(([name, sections]) => ({ name, sections }));
}, [classes, bySection]);

// Derived (not stored) so the modal's subtitle counts stay live if bySection
// resolves while the picker is already open.
const picker = grades.find((g) => g.name === pickerGradeName) ?? null;

const openAttendance = (classId: string) => {
  setPickerGradeName(null);
  navigation.navigate('AttendanceScreen', { classId });
};
```

Replace the date-card text (which called `todayISO()` inline) — find:

```tsx
<Text style={styles.dateText}>{formatLongDate(todayISO())}</Text>
```

with:

```tsx
<Text style={styles.dateText}>{formatLongDate(today)}</Text>
```

Replace the grade card `TouchableOpacity` block:

```tsx
<TouchableOpacity style={styles.gradeCard} onPress={() => setPicker(g)} activeOpacity={0.85}>
  <View style={[styles.gradeIcon, { backgroundColor: cs.color }]}>
    <Ionicons name="school" size={22} color={Colors.white} />
  </View>
  <View style={styles.gradeInfo}>
    <Text style={styles.gradeName}>{gradeLabel(g.name)}</Text>
    <Text style={styles.gradeMeta}>
      {g.sections.length} section{g.sections.length > 1 ? 's' : ''} · tap to choose
    </Text>
  </View>
  <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
</TouchableOpacity>
```

with:

```tsx
<TouchableOpacity
  style={styles.gradeCard}
  onPress={() => setPickerGradeName(g.name)}
  activeOpacity={0.85}
>
  <View style={[styles.gradeIcon, { backgroundColor: cs.color }]}>
    <Ionicons name="school" size={22} color={Colors.white} />
  </View>
  <View style={styles.gradeInfo}>
    <Text style={styles.gradeName}>{gradeLabel(g.name)}</Text>
    <Text style={styles.gradeMeta}>
      {g.sections.length} section{g.sections.length > 1 ? 's' : ''} · tap to choose
    </Text>
    {(() => {
      const summary = aggregateSections(
        g.sections.map((s) => bySection[s.id] ?? { total: 0, present: 0 })
      );
      if (summariesLoading) return <Text style={styles.gradeSummary}>…</Text>;
      if (summary.total === 0) return <Text style={styles.gradeSummary}>No students</Text>;
      return (
        <Text style={styles.gradeSummary}>
          Present {summary.present}/{summary.total} · {summary.pct}%
        </Text>
      );
    })()}
  </View>
  <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
</TouchableOpacity>
```

Replace the modal's `onClose` prop:

```tsx
        onClose={() => setPicker(null)}
```

with:

```tsx
        onClose={() => setPickerGradeName(null)}
```

Finally, add a new style to the `StyleSheet.create` call, right after `gradeMeta`:

```tsx
  gradeMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 3,
  },
```

becomes:

```tsx
  gradeMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 3,
  },
  gradeSummary: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 6: Commit**

```bash
git add src/screens/AttendancePickClassScreen.tsx src/screens/__tests__/AttendancePickClassScreen.test.tsx
git commit -m "feat(attendance): show Present/Total/% summary on grade cards, fix stubbed section student counts"
```

---

### Task 4: Auto-navigate back after a successful attendance save

**Files:**

- Modify: `src/screens/AttendanceScreen.tsx`
- Test: `src/screens/__tests__/AttendanceScreen.test.tsx`

**Interfaces:**

- Consumes: existing `useClass`, `useStudentsByClass`, `useAttendance`, `useMarkAttendance` hooks (unchanged signatures).
- Produces: updated `AttendanceScreen` — no exported interface changes.

- [ ] **Step 1: Write the failing test**

Create `src/screens/__tests__/AttendanceScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { AttendanceScreen } from '../AttendanceScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, Student } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string }) => ReactLib.createElement(Text, null, `icon:${props.name}`),
  };
});
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { classId: 'c1' } }),
}));

const cls: Class = {
  id: 'c1',
  name: 'IV',
  section: 'A',
  subject: 'Math',
  studentCount: 0,
  room: '101',
};
const student: Student = {
  id: 's1',
  name: 'Asha',
  roll: '1',
  initials: 'AS',
  classId: 'c1',
  attendance: 0,
  grade: 'IV',
  parent: '',
  parentPhone: '',
  photoUrl: null,
};

function renderScreen(repos: Repositories) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repositories={repos}>
          <AuthProvider>
            <AttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockGoBack.mockClear();
});

test('navigates back ~1s after a successful save', async () => {
  jest.useFakeTimers();
  const repos = {
    classes: { get: jest.fn(async () => cls) },
    students: {
      listByClass: jest.fn(async () => ({ items: [student], nextCursor: null })),
    },
    attendance: {
      forClass: jest.fn(async () => []),
      save: jest.fn(async () => undefined),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Asha')).toBeTruthy());
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(repos.attendance.save).toHaveBeenCalled());
  expect(mockGoBack).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(mockGoBack).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});

test('stays on screen and does not navigate back when save fails', async () => {
  jest.useFakeTimers();
  const repos = {
    classes: { get: jest.fn(async () => cls) },
    students: {
      listByClass: jest.fn(async () => ({ items: [student], nextCursor: null })),
    },
    attendance: {
      forClass: jest.fn(async () => []),
      save: jest.fn(async () => {
        throw new Error('network error');
      }),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Asha')).toBeTruthy());
  fireEvent.press(screen.getByText(/Submit Attendance/));

  await waitFor(() => expect(repos.attendance.save).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockGoBack).not.toHaveBeenCalled();

  jest.useRealTimers();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/screens/__tests__/AttendanceScreen.test.tsx`
Expected: FAIL — `mockGoBack` never called (screen doesn't navigate back yet).

- [ ] **Step 3: Implement the auto-navigate-back behavior**

Modify `src/screens/AttendanceScreen.tsx`.

Replace the route import line:

```tsx
import { useRoute, RouteProp } from '@react-navigation/native';
```

with:

```tsx
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
```

Add `useRef` to the React import:

```tsx
import React, { useState, useEffect } from 'react';
```

becomes:

```tsx
import React, { useState, useEffect, useRef } from 'react';
```

Inside the component, right after `const { classId } = route.params;`, add the navigation hook and a ref for the pending timeout:

```tsx
const route = useRoute<AttRoute>();
const insets = useSafeAreaInsets();
const { classId } = route.params;
```

becomes:

```tsx
const route = useRoute<AttRoute>();
const navigation = useNavigation();
const insets = useSafeAreaInsets();
const { classId } = route.params;
const goBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(
  () => () => {
    if (goBackTimer.current) clearTimeout(goBackTimer.current);
  },
  []
);
```

Replace `handleSubmit`:

```tsx
const handleSubmit = () => {
  const records: AttendanceRecord[] = classStudents.map((s) => ({
    studentId: s.id,
    status: attendance[s.id] ?? 'P',
    date,
  }));
  mutation.mutate(records, {
    onSuccess: () => setToastVisible(true),
    onError: () => setErrorToastVisible(true),
  });
};
```

with:

```tsx
const handleSubmit = () => {
  const records: AttendanceRecord[] = classStudents.map((s) => ({
    studentId: s.id,
    status: attendance[s.id] ?? 'P',
    date,
  }));
  mutation.mutate(records, {
    onSuccess: () => {
      setToastVisible(true);
      goBackTimer.current = setTimeout(() => navigation.goBack(), 1000);
    },
    onError: () => setErrorToastVisible(true),
  });
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/screens/__tests__/AttendanceScreen.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 6: Commit**

```bash
git add src/screens/AttendanceScreen.tsx src/screens/__tests__/AttendanceScreen.test.tsx
git commit -m "feat(attendance): auto-return to previous screen ~1s after a successful save"
```

---

### Task 5: Manual verification and typecheck

**Files:**

- None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS, all tests including the 4 new/modified files from Tasks 1-4

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test (if a running app/simulator is available)**

- Open the Attendance tab: confirm each grade card shows "Present X/Y · Z%" (or "No students" / "…" briefly on first load).
- Tap a grade card: confirm the section bottom sheet shows real student counts (not "0 students").
- Mark a section's attendance and submit: confirm the success toast appears, then the screen auto-returns to the grade list after about a second, and that grade's summary line has updated to reflect the new count.
- Trigger a save failure (e.g. disable network): confirm the error toast shows and the screen does NOT navigate away.

- [ ] **Step 4: Report back to user**

Summarize what changed (grade card summaries, fixed section counts, auto-return on save) and confirm test/typecheck results.
