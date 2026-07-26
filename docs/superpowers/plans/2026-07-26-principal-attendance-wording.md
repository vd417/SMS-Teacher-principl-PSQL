# Principal Attendance Screen Wording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `PrincipalAttendanceScreen`'s grade-card wording with the teacher screen's phrasing ("Present X/Y" instead of "X/Y present") and add a "No students" state for grades with zero total students, without changing any data source, calculation, or visual layout otherwise.

**Architecture:** Single-file change — a conditional render branch in `PrincipalAttendanceScreen.tsx`'s grade-card JSX. No new hooks, no backend changes; `usePrincipalAttendance()`'s data is already verified real (see `docs/superpowers/audits/2026-07-24-live-data-findings.md` rows 136-138).

**Tech Stack:** React Native + TypeScript, `@tanstack/react-query`, `@testing-library/react-native`, Jest (`jest-expo` preset).

## Global Constraints

- Grade card count text changes from `{present}/{total} present` to `Present {present}/{total}` — wording only, same position in the existing 2-column row (count on the left, bold `%` on the right).
- When a grade's `total` is 0, render `No students` in place of both the count/pct row and the progress bar beneath it. `pct` is already `0` (not `NaN`) in this case — no calculation change needed.
- No changes to `usePrincipalAttendance`, the backend, the school-total card, the staff cards, or the section picker.
- No visual/layout redesign — card color, progress bar, spacing all stay as-is for non-zero-total grades.

---

### Task 1: Wording alignment + "No students" state on `PrincipalAttendanceScreen`

**Files:**

- Modify: `src/screens/principal/PrincipalAttendanceScreen.tsx`
- Test: `src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`

**Interfaces:**

- Consumes: existing `usePrincipalAttendance()` (returns `{ data: SchoolAttendance, isLoading }`), existing `useClasses()` (returns `{ data: Class[] }`) — both unchanged.
- Produces: no exported interface changes; this task only changes the screen's rendered output.

- [ ] **Step 1: Write the failing test**

Create `src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrincipalAttendanceScreen } from '../PrincipalAttendanceScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class, SchoolAttendance } from '@/data/domain';

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

const classList: Class[] = [
  { id: 'c1', name: 'IV', section: 'A', subject: 'Math', studentCount: 0, room: '101' },
  { id: 'c2', name: 'V', section: 'A', subject: 'Math', studentCount: 0, room: '102' },
];

const attendanceData: SchoolAttendance = {
  date: '2026-07-26',
  presentTotal: 28,
  studentTotal: 30,
  overallPct: 93,
  classes: [
    { classId: 'c1', className: 'IV-A', present: 28, total: 30, pct: 93 },
    { classId: 'c2', className: 'V-A', present: 0, total: 0, pct: 0 },
  ],
  staff: [],
};

function renderScreen(repos: Repositories) {
  // A fresh QueryClient per render — reusing the app's shared singleton across
  // tests would serve one test's cached query results to the next.
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
            <PrincipalAttendanceScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test('shows "Present X/Y" phrasing for a grade with students, and "No students" for a grade with none', async () => {
  const repos = {
    principal: { attendance: jest.fn(async () => attendanceData) },
    classes: { list: jest.fn(async () => classList) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('Present 28/30')).toBeTruthy());
  expect(screen.getByText('93%')).toBeTruthy();

  expect(screen.getByText('No students')).toBeTruthy();
  expect(screen.queryByText('Present 0/0')).toBeNull();
  expect(screen.queryByText('0%')).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`
Expected: FAIL — the screen currently renders "28/30 present" (not "Present 28/30") and "0/0 present" + "0%" (not "No students") for the zero-total grade.

- [ ] **Step 3: Implement the wording change**

Modify `src/screens/principal/PrincipalAttendanceScreen.tsx`. Replace:

```tsx
                    <View style={styles.cardAttRow}>
                      <Text style={styles.cardCount}>
                        {g.present}/{g.total} present
                      </Text>
                      <Text style={styles.cardPct}>{g.pct}%</Text>
                    </View>
                    <View style={styles.cardBarTrack}>
                      <View style={[styles.cardBarFill, { width: `${g.pct}%` }]} />
                    </View>
```

with (note: fenced as plain text, not `tsx`, so the markdown formatter
doesn't rewrite this JSX-expression-container snippet into an invalid
statement — copy it verbatim, it is valid JSX in context):

```text
                    {g.total === 0 ? (
                      <Text style={styles.cardCount}>No students</Text>
                    ) : (
                      <>
                        <View style={styles.cardAttRow}>
                          <Text style={styles.cardCount}>
                            Present {g.present}/{g.total}
                          </Text>
                          <Text style={styles.cardPct}>{g.pct}%</Text>
                        </View>
                        <View style={styles.cardBarTrack}>
                          <View style={[styles.cardBarFill, { width: `${g.pct}%` }]} />
                        </View>
                      </>
                    )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx jest`
Expected: PASS, no new failures

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/screens/principal/PrincipalAttendanceScreen.tsx src/screens/principal/__tests__/PrincipalAttendanceScreen.test.tsx
git commit -m "fix(principal): align attendance card wording with teacher screen, add No students state"
```
