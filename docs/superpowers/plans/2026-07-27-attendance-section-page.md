# Attendance Section Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-sheet section picker on the teacher's "Mark Attendance" flow with a dedicated full page, without touching the grade-card list, the student roll-call screen, or the Principal's attendance flow (which still uses the same bottom-sheet component).

**Architecture:** A new screen (`AttendancePickSectionScreen`) is added to the existing Home navigation stack, taking a `gradeName` route param. It reuses the existing `useClasses()`/`useSectionAttendanceSummaries()` hooks (already built) to render real, non-stubbed section student counts. `AttendancePickClassScreen`'s grade-card tap now navigates to this new screen instead of opening `SectionPickerModal`. A small shared `sectionLabel` helper is extracted so both the modal (still used by the Principal screen) and the new page format section names identically without duplicating the logic.

**Tech Stack:** React Native + TypeScript, `@react-navigation/native-stack`, `@tanstack/react-query`, `@testing-library/react-native`, Jest.

## Global Constraints

- `SectionPickerModal` is not deleted or behaviorally changed — `PrincipalAttendanceScreen` still uses it, and that screen is out of scope.
- `AttendanceScreen` (student roll-call) is unchanged; still reached via `navigation.navigate('AttendanceScreen', { classId })`.
- The grade-card list and its "Present X/Y · Z%" summary on `AttendancePickClassScreen` are unchanged.
- The new screen's section counts must use the real fetched roster count (`useSectionAttendanceSummaries`), never the backend's stubbed-always-0 `Class.studentCount` field.
- No changes to any other entry point that already bypasses the grade/section picker (e.g. `ClassesScreen`'s direct "Attendance" button).

---

### Task 1: Extract `sectionLabel` into the shared label-helpers module

**Files:**

- Modify: `src/lib/classLabel.ts`
- Modify: `src/components/ui/SectionPickerModal.tsx`
- Test: `src/lib/__tests__/classLabel.test.ts`

**Interfaces:**

- Produces: `sectionLabel(section: string): string` exported from `@/lib/classLabel` — Task 2's new screen imports this.

`SectionPickerModal.tsx` currently defines this exact function as a private, unexported helper at the top of the file. Task 2 needs the identical formatting for the new full-page screen, so this task moves it to the shared `classLabel.ts` module (which already holds `classLabel`/`gradeLabel`, the same kind of label-formatting helper) instead of duplicating it.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/classLabel.test.ts` (append after the existing tests, keep the existing `import` line as-is but add `sectionLabel` to it):

Replace:

```ts
import { classLabel, gradeLabel } from '../classLabel';
```

with:

```ts
import { classLabel, gradeLabel, sectionLabel } from '../classLabel';
```

Then append at the end of the file:

```ts
test('sectionLabel prefixes a bare letter with "Section "', () => {
  expect(sectionLabel('A')).toBe('Section A');
});

test('sectionLabel leaves a section that already says "Section" or "Sec" unchanged', () => {
  expect(sectionLabel('Section A')).toBe('Section A');
  expect(sectionLabel('Sec A')).toBe('Sec A');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/__tests__/classLabel.test.ts`
Expected: FAIL — `sectionLabel` is not exported from `../classLabel`.

- [ ] **Step 3: Add `sectionLabel` to `classLabel.ts`**

Append to `src/lib/classLabel.ts`:

```ts
/** "A" -> "Section A". Some sections are already stored with the word folded
 * in (e.g. "Sec A"), so prepending "Section" again would read "Section Sec A". */
export function sectionLabel(section: string): string {
  return /\bsec(tion)?\b/i.test(section) ? section : `Section ${section}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/__tests__/classLabel.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Remove the duplicate from `SectionPickerModal.tsx` and import the shared one**

In `src/components/ui/SectionPickerModal.tsx`, replace:

```tsx
import { deriveColorSet } from '../../theme/derive';

/** "A" -> "Section A". Some sections are already stored with the word folded
 * in (e.g. "Sec A"), so prepending "Section" again would read "Section Sec A". */
function sectionLabel(section: string): string {
  return /\bsec(tion)?\b/i.test(section) ? section : `Section ${section}`;
}
```

with:

```tsx
import { deriveColorSet } from '../../theme/derive';
import { sectionLabel } from '../../lib/classLabel';
```

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures (this confirms `SectionPickerModal`'s existing consumers — the Principal screen — still work identically with the imported helper)

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/lib/classLabel.ts src/lib/__tests__/classLabel.test.ts src/components/ui/SectionPickerModal.tsx
git commit -m "refactor(lib): extract sectionLabel into classLabel.ts, shared by SectionPickerModal"
```

---

### Task 2: New `AttendancePickSectionScreen` + navigation wiring

**Files:**

- Create: `src/screens/AttendancePickSectionScreen.tsx`
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/MainTabNavigator.tsx`
- Test: `src/screens/__tests__/AttendancePickSectionScreen.test.tsx`

**Interfaces:**

- Consumes: `sectionLabel`, `gradeLabel` from Task 1's `@/lib/classLabel`; existing `useClasses()` from `@/features/classes/hooks`; existing `useSectionAttendanceSummaries(classIds, date)` from `@/features/attendance/hooks`; existing `deriveColorSet(id)` from `@/theme/derive`; existing `ScreenHeader` from `../components`.
- Produces: `AttendancePickSectionScreen` React component (default screen, no props — reads `gradeName` from its route). New route `AttendancePickSection: { gradeName: string }` on `HomeStackParamList` — Task 3 navigates to this.

- [ ] **Step 1: Write the failing test**

Create `src/screens/__tests__/AttendancePickSectionScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AttendancePickSectionScreen } from '../AttendancePickSectionScreen';
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

const mockNavigate = jest.fn();
let mockGradeName = 'IV';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { gradeName: mockGradeName } }),
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
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
            <AttendancePickSectionScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockGradeName = 'IV';
});

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

test('does not show "0 students" while summaries are still loading', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  ];

  let resolveRoster!: (v: { items: Student[]; nextCursor: null }) => void;
  const rosterPromise = new Promise<{ items: Student[]; nextCursor: null }>((resolve) => {
    resolveRoster = resolve;
  });

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: { listByClass: jest.fn(() => rosterPromise) },
    attendance: { forClass: jest.fn(async () => [] as AttendanceRecord[]) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Section A')).toBeTruthy());
  expect(screen.queryByText('0 students')).toBeNull();

  resolveRoster({ items: makeStudents(2, 'c1'), nextCursor: null });

  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
});

test('shows an empty state when the grade has no matching sections', async () => {
  mockGradeName = 'Nonexistent Grade';
  const repos = {
    classes: { list: jest.fn(async () => [] as Class[]) },
    students: { listByClass: jest.fn(async () => ({ items: [], nextCursor: null })) },
    attendance: { forClass: jest.fn(async () => []) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('No sections found')).toBeTruthy());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/screens/__tests__/AttendancePickSectionScreen.test.tsx`
Expected: FAIL — `Cannot find module '../AttendancePickSectionScreen'`

- [ ] **Step 3: Add the route param type**

In `src/navigation/types.ts`, replace:

```ts
AttendancePickClass: undefined;
AttendanceScreen: {
  classId: string;
}
```

with:

```ts
AttendancePickClass: undefined;
AttendancePickSection: {
  gradeName: string;
}
AttendanceScreen: {
  classId: string;
}
```

- [ ] **Step 4: Create the screen**

Create `src/screens/AttendancePickSectionScreen.tsx`:

```tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';
import { deriveColorSet } from '@/theme/derive';
import { todayISO } from '@/lib/date';
import { gradeLabel, sectionLabel } from '@/lib/classLabel';
import type { HomeStackParamList } from '../navigation/types';

type AttPickSectionNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickSection'>;
type AttPickSectionRoute = RouteProp<HomeStackParamList, 'AttendancePickSection'>;

export const AttendancePickSectionScreen: React.FC = () => {
  const navigation = useNavigation<AttPickSectionNav>();
  const route = useRoute<AttPickSectionRoute>();
  const insets = useSafeAreaInsets();
  const { gradeName } = route.params;

  const today = todayISO();
  const { data: classes = [], isLoading, isError } = useClasses();
  const sections = useMemo(() => classes.filter((c) => c.name === gradeName), [classes, gradeName]);
  const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
    sections.map((c) => c.id),
    today
  );

  const openAttendance = (classId: string) => {
    navigation.navigate('AttendanceScreen', { classId });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title={gradeLabel(gradeName)} subtitle="Choose a section" showBack />
      </Animated.View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load sections</Text>
        </View>
      )}

      {!isLoading && !isError && sections.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No sections found</Text>
        </View>
      )}

      <View style={styles.grid}>
        {sections.map((c, i) => {
          const cs = deriveColorSet(c.id);
          const total = bySection[c.id]?.total;
          const subtitle = summariesLoading
            ? undefined
            : `${total ?? 0} student${(total ?? 0) === 1 ? '' : 's'}`;
          return (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(100 + i * 60).springify()}
              style={styles.optionWrap}
            >
              <TouchableOpacity
                style={[styles.option, { backgroundColor: cs.colorSoft, borderColor: cs.color }]}
                activeOpacity={0.85}
                onPress={() => openAttendance(c.id)}
              >
                <View style={[styles.badge, { backgroundColor: cs.color }]}>
                  <Text style={styles.badgeText}>{c.section}</Text>
                </View>
                <Text style={[styles.optionLabel, { color: cs.color }]}>
                  {sectionLabel(c.section)}
                </Text>
                {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionWrap: { flexGrow: 1, flexBasis: '44%' },
  option: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    ...Shadows.card,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FontFamily.extraBold, fontSize: 18, color: Colors.white },
  optionLabel: { fontFamily: FontFamily.bold, fontSize: 15 },
  optionSub: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
});
```

- [ ] **Step 5: Register the screen in the Home stack**

In `src/navigation/MainTabNavigator.tsx`, replace:

```tsx
import { AttendancePickClassScreen } from '../screens/AttendancePickClassScreen';
```

with:

```tsx
import { AttendancePickClassScreen } from '../screens/AttendancePickClassScreen';
import { AttendancePickSectionScreen } from '../screens/AttendancePickSectionScreen';
```

Then replace:

```tsx
    <HomeStack.Screen name="AttendancePickClass" component={AttendancePickClassScreen} />
    <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
```

with:

```tsx
    <HomeStack.Screen name="AttendancePickClass" component={AttendancePickClassScreen} />
    <HomeStack.Screen name="AttendancePickSection" component={AttendancePickSectionScreen} />
    <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/screens/__tests__/AttendancePickSectionScreen.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/screens/AttendancePickSectionScreen.tsx src/screens/__tests__/AttendancePickSectionScreen.test.tsx src/navigation/types.ts src/navigation/MainTabNavigator.tsx
git commit -m "feat(attendance): add AttendancePickSectionScreen, wire into Home stack"
```

---

### Task 3: `AttendancePickClassScreen` navigates to the new page instead of opening the modal

**Files:**

- Modify: `src/screens/AttendancePickClassScreen.tsx`
- Modify: `src/screens/__tests__/AttendancePickClassScreen.test.tsx`

**Interfaces:**

- Consumes: `AttendancePickSection: { gradeName: string }` route (Task 2).
- Produces: no exported interface changes — this task only changes the screen's tap behavior and removes now-unused modal wiring.

- [ ] **Step 1: Update the test file — replace the modal-interaction assertions with a navigation assertion**

In `src/screens/__tests__/AttendancePickClassScreen.test.tsx`, replace the react-navigation mock:

```tsx
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
```

with:

```tsx
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});
```

Replace the first test's body (everything from `renderScreen(repos);` to the end of that test) — find:

```tsx
  renderScreen(repos);

  // Total = 2 + 3 = 5, Present = 2 + 0 = 2, pct = round(2/5*100) = 40.
  await waitFor(() => expect(screen.getByText('Present 2/5 · 40%')).toBeTruthy());

  fireEvent.press(screen.getByText('IV'));

  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
  expect(screen.getByText('3 students')).toBeTruthy();
});
```

with:

```tsx
  renderScreen(repos);

  // Total = 2 + 3 = 5, Present = 2 + 0 = 2, pct = round(2/5*100) = 40.
  await waitFor(() => expect(screen.getByText('Present 2/5 · 40%')).toBeTruthy());

  fireEvent.press(screen.getByText('IV'));

  expect(mockNavigate).toHaveBeenCalledWith('AttendancePickSection', { gradeName: 'IV' });
});
```

Delete the entire second test (its concern — the section picker's loading-state subtitle — now belongs to `AttendancePickSectionScreen` and is covered by Task 2's test file), i.e. remove this whole block:

```tsx
test('does not show "0 students" in the section picker while summaries are still loading', async () => {
  const classes: Class[] = [
    { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  ];

  let resolveRoster!: (v: { items: Student[]; nextCursor: null }) => void;
  let resolveAttendance!: (v: AttendanceRecord[]) => void;
  const rosterPromise = new Promise<{ items: Student[]; nextCursor: null }>((resolve) => {
    resolveRoster = resolve;
  });
  const attendancePromise = new Promise<AttendanceRecord[]>((resolve) => {
    resolveAttendance = resolve;
  });

  const repos = {
    classes: { list: jest.fn(async () => classes) },
    students: {
      listByClass: jest.fn(() => rosterPromise),
    },
    attendance: {
      forClass: jest.fn(() => attendancePromise),
    },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('IV')).toBeTruthy());
  fireEvent.press(screen.getByText('IV'));

  // Modal is open (section badge/label rendered) but roster + attendance are
  // still in flight, so the subtitle must not show a stubbed-looking "0 students".
  await waitFor(() => expect(screen.getByText('Section A')).toBeTruthy());
  expect(screen.queryByText('0 students')).toBeNull();
  expect(screen.queryByText('2 students')).toBeNull();

  resolveRoster({ items: makeStudents(2, 'c1'), nextCursor: null });
  resolveAttendance([]);

  await waitFor(() => expect(screen.getByText('2 students')).toBeTruthy());
});
```

Leave the remaining two tests ("excludes a section from the aggregate..." and "shows 'No students' when a grade has no students...") unchanged — they test the card-level summary, not the modal, and are unaffected by this task.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx`
Expected: FAIL — `mockNavigate` was never called with `'AttendancePickSection'` (the screen still opens the modal).

- [ ] **Step 3: Update the screen**

In `src/screens/AttendancePickClassScreen.tsx`, replace the import line:

```tsx
import React, { useMemo, useState } from 'react';
```

with:

```tsx
import React, { useMemo } from 'react';
```

Replace:

```tsx
import { ScreenHeader, SectionPickerModal } from '../components';
import type { SectionOption } from '../components';
```

with:

```tsx
import { ScreenHeader } from '../components';
```

Replace:

```tsx
type GradeGroup = { name: string; sections: SectionOption[] };
```

with:

```tsx
type GradeGroup = { name: string; sections: { id: string; section: string }[] };
```

Replace:

```tsx
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
      subtitle: summariesLoading
        ? undefined
        : `${total ?? 0} student${(total ?? 0) === 1 ? '' : 's'}`,
    });
    map.set(c.name, arr);
  }
  return [...map.entries()].map(([name, sections]) => ({ name, sections }));
}, [classes, bySection, summariesLoading]);

// Derived (not stored) so the modal's subtitle counts stay live if bySection
// resolves while the picker is already open.
const picker = grades.find((g) => g.name === pickerGradeName) ?? null;

const openAttendance = (classId: string) => {
  setPickerGradeName(null);
  navigation.navigate('AttendanceScreen', { classId });
};
```

with:

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

Replace:

```tsx
            <TouchableOpacity
              style={styles.gradeCard}
              onPress={() => setPickerGradeName(g.name)}
              activeOpacity={0.85}
            >
```

with:

```tsx
            <TouchableOpacity
              style={styles.gradeCard}
              onPress={() => navigation.navigate('AttendancePickSection', { gradeName: g.name })}
              activeOpacity={0.85}
            >
```

Replace:

```tsx
      <SectionPickerModal
        visible={!!picker}
        gradeName={picker ? gradeLabel(picker.name) : null}
        sections={picker?.sections ?? []}
        onSelect={openAttendance}
        onClose={() => setPickerGradeName(null)}
      />
    </ScrollView>
```

with:

```tsx
    </ScrollView>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/screens/__tests__/AttendancePickClassScreen.test.tsx`
Expected: PASS (3 tests — one navigation test plus the two unchanged card-summary tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/screens/AttendancePickClassScreen.tsx src/screens/__tests__/AttendancePickClassScreen.test.tsx
git commit -m "feat(attendance): grade card navigates to the new section page instead of opening a modal"
```

---

### Task 4: Manual verification and typecheck

**Files:**

- None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS, all tests including the new/modified files from Tasks 1-3

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test (if a running app/simulator is available)**

- Open the teacher's Attendance tab: confirm grade cards still show and their "Present X/Y · Z%" summary is unchanged.
- Tap a grade card: confirm it opens a full page (with a back button and its own header, not a bottom-sheet popup) listing that grade's sections with real (non-zero) student counts.
- Tap a section: confirm it opens the student roll-call screen exactly as before.
- Press back from the section page: confirm it returns to the grade-card list.
- Open the Principal role's Attendance tab: confirm its section picker is still a bottom-sheet popup (unchanged).

- [ ] **Step 4: Report back to user**

Confirm the new page replaces the popup on the teacher's flow, the Principal flow is unaffected, and test/typecheck results.
