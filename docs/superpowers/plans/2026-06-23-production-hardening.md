# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live-wired teacher app honestly functional and safe to ship — fix fabricated/broken UI data, make production builds deployable and observable, and confirm resilience basics.

**Architecture:** The app is already live-only (screens → react-query hooks → repositories → `sms-backend`). This plan adds: a pure date helper, fixes to two screens that render fabricated data, a fail-fast env validator, EAS build env wiring, Sentry crash reporting (no-op without DSN), a PII-safe error breadcrumb in the HTTP client, and a top-level error boundary + offline banner.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript, react-query v5, Zod v4, `@sentry/react-native`, `@react-native-community/netinfo`, Jest + @testing-library/react-native.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-23-production-hardening-design.md`.
- All `tsc --noEmit` must stay clean; the existing **55 tests must stay green**.
- Repositories use `/v1`-relative paths; the HTTP client strips the `{data}` envelope. Do not change that contract.
- **Never** log/report tokens, Authorization headers, or request/response bodies (PII). Breadcrumbs carry only `{ path, status, code }`.
- Sentry and env validation must **no-op / fall back in dev and tests** — only enforce/enable in production (`!__DEV__`) or when a DSN is present.
- Path alias `@/` maps to `src/`. Follow existing file conventions (named exports, `StyleSheet.create`, `Colors` from `@/theme`).
- Commit after each task with the shown message.

---

### Task 1: Pure date helper

**Files:**

- Create: `src/lib/date.ts`
- Test: `src/__tests__/lib/date.test.ts`

**Interfaces:**

- Produces: `todayISO(d?: Date): string` → local `YYYY-MM-DD`; `formatLongDate(iso: string): string` → e.g. `"Mon, 27 Apr 2026"`; `addDays(iso: string, n: number): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/date.test.ts
import { todayISO, formatLongDate, addDays } from '@/lib/date';

describe('date helpers', () => {
  it('todayISO formats a given local date as YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 3, 27))).toBe('2026-04-27'); // month is 0-based
  });

  it('todayISO zero-pads month and day', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatLongDate renders a human date', () => {
    expect(formatLongDate('2026-04-27')).toBe('Mon, 27 Apr 2026');
  });

  it('addDays moves the date forward and backward without timezone drift', () => {
    expect(addDays('2026-04-27', 1)).toBe('2026-04-28');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/date.test.ts`
Expected: FAIL — `Cannot find module '@/lib/date'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/date.ts
// Local-time date helpers. We build YYYY-MM-DD from local components (not
// toISOString, which is UTC and drifts a day near midnight). Parsing splits the
// string and uses the Date(y, m, d) constructor so there is no UTC interpretation.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/date.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/__tests__/lib/date.test.ts
git commit -m "feat(lib): local-time date helpers (todayISO/formatLongDate/addDays)"
```

---

### Task 2: AttendanceScreen — write to today, with a date stepper

**Files:**

- Modify: `src/screens/AttendanceScreen.tsx` (remove const at `:31`, add date state + stepper; uses at `:104,:105,:148`)

**Interfaces:**

- Consumes: `todayISO`, `formatLongDate`, `addDays` from Task 1; existing `useAttendance(classId, date)`, `useMarkAttendance(classId, date)`.
- Produces: nothing downstream.

- [ ] **Step 1: Remove the hardcoded constant and import helpers**

In `src/screens/AttendanceScreen.tsx`, delete lines 30-31:

```ts
// Use the seed date so existing records show up
const ATTENDANCE_DATE = '2026-04-27';
```

Add to the imports block (near the other `@/` imports, after line 24):

```ts
import { todayISO, formatLongDate, addDays } from '@/lib/date';
```

- [ ] **Step 2: Add date state and wire it into the hooks**

Inside `AttendanceScreen`, immediately after `const { classId } = route.params;` (line 92), add:

```ts
const [date, setDate] = useState<string>(() => todayISO());
const today = todayISO();
const goPrevDay = () => setDate((d) => addDays(d, -1));
const goNextDay = () => setDate((d) => (d >= today ? d : addDays(d, 1)));
```

Replace the three `ATTENDANCE_DATE` usages:

- Line 104: `useAttendance(classId, ATTENDANCE_DATE)` → `useAttendance(classId, date)`
- Line 105: `useMarkAttendance(classId, ATTENDANCE_DATE)` → `useMarkAttendance(classId, date)`
- Line 148: `date: ATTENDANCE_DATE,` → `date,`

- [ ] **Step 3: Render the date stepper above the stats bar**

In the JSX, between the `ScreenHeader` `Animated.View` (closes at line 194) and the `{/* Stats Bar */}` comment (line 196), insert:

```tsx
<Animated.View entering={FadeInDown.delay(70).springify()} style={styles.dateBar}>
  <TouchableOpacity onPress={goPrevDay} style={styles.dateNav} accessibilityLabel="Previous day">
    <Ionicons name="chevron-back" size={18} color={Colors.primary} />
  </TouchableOpacity>
  <Text style={styles.dateLabel}>{formatLongDate(date)}</Text>
  <TouchableOpacity
    onPress={goNextDay}
    disabled={date >= today}
    style={[styles.dateNav, date >= today && styles.dateNavDisabled]}
    accessibilityLabel="Next day"
  >
    <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
  </TouchableOpacity>
</Animated.View>
```

Add `Ionicons` to the imports if not already present (check top of file; `@expo/vector-icons`):

```ts
import { Ionicons } from '@expo/vector-icons';
```

Add these keys to the `StyleSheet.create({ ... })` object at the bottom of the file:

```ts
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateNav: { padding: 8, borderRadius: 999, backgroundColor: Colors.primarySoft2 },
  dateNavDisabled: { opacity: 0.35 },
  dateLabel: { fontFamily: FontFamily.semibold, fontSize: 14, color: Colors.ink },
```

(`FontFamily` is already imported at line 19; `Colors.primarySoft2`/`Colors.ink` already used in the codebase — verify they exist in `@/theme`, substitute the nearest existing token if not.)

- [ ] **Step 4: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx jest --silent`
Expected: tsc clean; 55+ tests pass (no test targets this screen directly, so count is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/screens/AttendanceScreen.tsx
git commit -m "fix(attendance): mark attendance for today with a back-dating stepper, not a hardcoded date"
```

---

### Task 3: HomeScreen — real date, drop fabricated pills, wire upcoming exam

**Files:**

- Modify: `src/screens/HomeScreen.tsx` (`:104` exam string, `:125-133` banner, `:186` date, `:200-211` fake pills)

**Interfaces:**

- Consumes: `formatLongDate`, `todayISO` (Task 1); existing `useExams()` (returns `Exam[]` with `{ title, subject, date, status }`).

- [ ] **Step 1: Import helpers and exams hook**

In `src/screens/HomeScreen.tsx`, add near the other `@/features` imports (after line 15):

```ts
import { useExams } from '@/features/exams/hooks';
import { todayISO, formatLongDate } from '@/lib/date';
```

- [ ] **Step 2: Replace the hardcoded exam with derived data**

Delete line 104: `const upcomingExam = 'Mid-Term Math · May 10';`

After the other hook calls (near line 72, after `useAnnouncements`), add:

```ts
const { data: exams = [] } = useExams();
const today = todayISO();
const nextExam = exams
  .filter((e) => e.date >= today && e.status !== 'completed')
  .sort((a, b) => a.date.localeCompare(b.date))[0];
```

> If `ExamStatus` has no `'completed'` member, drop the `e.status !== 'completed'` clause — the date filter alone is sufficient. Verify against `src/data/domain/index.ts`.

- [ ] **Step 3: Render the banner only when an exam exists**

Replace the banner block (lines 125-133) with:

```tsx
{
  /* Upcoming Banner */
}
{
  nextExam && (
    <Animated.View entering={FadeInDown.delay(120).springify()}>
      <TouchableOpacity style={styles.banner} activeOpacity={0.85}>
        <View style={styles.bannerDot} />
        <Ionicons name="alarm" size={15} color={Colors.primary} />
        <Text style={styles.bannerText}>
          Next exam: {nextExam.title} · {formatLongDate(nextExam.date)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.primaryBright} />
      </TouchableOpacity>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Use the real date and remove the fabricated stat pills**

Replace the hardcoded date at line 186:

```tsx
<Text style={styles.attendanceDate}>{formatLongDate(today)}</Text>
```

Delete the fabricated pills block (lines 200-212, the `<View style={styles.attStats}>…</View>` containing the four hardcoded `{ label: 'Present', value: '28' … }` entries). The real `attendanceToday` donut (lines 188-198) and the `Mark Attendance` button (lines 213-219) stay.

> Leave `styles.attStats`/`statPill`/`statVal`/`statLbl` in the stylesheet (unused styles are harmless and avoid churn), or remove them if the linter flags unused — `npm run lint` will tell you.

- [ ] **Step 5: Typecheck, lint, and run the suite**

Run: `npx tsc --noEmit && npm run lint && npx jest --silent`
Expected: tsc clean; lint clean; 55+ tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "fix(home): real date + live next-exam banner; remove fabricated attendance pills"
```

---

### Task 4: Fail-fast env validation

**Files:**

- Modify: `src/config/env.ts`
- Test: `src/__tests__/config/env.test.ts` (create)

**Interfaces:**

- Produces: `loadEnv(raw: NodeJS.ProcessEnv, isDev: boolean): { API_BASE_URL: string; GOOGLE_MAPS_API_KEY: string; SENTRY_DSN: string }` (throws in prod on bad URL); `env` (the resolved object, computed via `loadEnv(process.env, __DEV__)`).

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/config/env.test.ts
import { loadEnv } from '@/config/env';

const PLACEHOLDER = 'https://api.schooldesk.local/v1';

describe('loadEnv', () => {
  it('accepts a valid https URL in production', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'https://api.school.com/v1' }, false);
    expect(out.API_BASE_URL).toBe('https://api.school.com/v1');
  });

  it('throws in production when the URL is missing', () => {
    expect(() => loadEnv({}, false)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it('throws in production when the URL is the placeholder host', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_API_BASE_URL: PLACEHOLDER }, false)).toThrow(/placeholder/i);
  });

  it('throws in production when the URL is not https', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'http://api.school.com/v1' }, false)).toThrow(
      /https/i
    );
  });

  it('falls back to the localhost placeholder in dev without throwing', () => {
    const out = loadEnv({}, true);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('passes through the optional maps key and sentry dsn', () => {
    const out = loadEnv(
      {
        EXPO_PUBLIC_API_BASE_URL: 'https://a.com/v1',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'k',
        EXPO_PUBLIC_SENTRY_DSN: 'd',
      },
      false
    );
    expect(out.GOOGLE_MAPS_API_KEY).toBe('k');
    expect(out.SENTRY_DSN).toBe('d');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/config/env.test.ts`
Expected: FAIL — `loadEnv` is not exported.

- [ ] **Step 3: Implement the validator**

```ts
// src/config/env.ts
// The app talks only to the live backend. API_BASE_URL must include the /v1
// prefix (every backend route is under /v1); repositories use /v1-relative paths.
// In production we fail fast on a missing/placeholder/non-https URL so a build can
// never silently ship pointing at nothing. In dev we keep a localhost default.
const PLACEHOLDER = 'https://api.schooldesk.local/v1';

export interface AppEnv {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  SENTRY_DSN: string;
}

export function loadEnv(raw: NodeJS.ProcessEnv, isDev: boolean): AppEnv {
  const url = raw.EXPO_PUBLIC_API_BASE_URL;

  if (!isDev) {
    if (!url) throw new Error('EXPO_PUBLIC_API_BASE_URL is required in production builds.');
    if (url === PLACEHOLDER)
      throw new Error(`EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}).`);
    if (!url.startsWith('https://'))
      throw new Error('EXPO_PUBLIC_API_BASE_URL must use https in production.');
  }

  return {
    API_BASE_URL: url ?? PLACEHOLDER,
    GOOGLE_MAPS_API_KEY: raw.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    SENTRY_DSN: raw.EXPO_PUBLIC_SENTRY_DSN ?? '',
  };
}

export const env: AppEnv = loadEnv(process.env, __DEV__);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/config/env.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests); tsc clean. (`env` retains `API_BASE_URL` and `GOOGLE_MAPS_API_KEY` so existing importers in `AppProviders`/maps code are unaffected.)

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts src/__tests__/config/env.test.ts
git commit -m "feat(config): fail-fast env validation; expose SENTRY_DSN"
```

---

### Task 5: EAS build env wiring

**Files:**

- Modify: `eas.json`

- [ ] **Step 1: Add env blocks to preview and production profiles**

Replace the `build` section of `eas.json` so `preview` and `production` carry the backend URL (swap in the real hosts). Keep `development` as-is:

```json
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://staging-api.schooldesk.app/v1"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.schooldesk.app/v1"
      }
    }
  },
```

> The Sentry DSN is a secret — do NOT inline it. Set it once via `eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`; EAS injects it at build time. Document the two real URLs with the project owner before the first production build.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add eas.json
git commit -m "chore(eas): pin preview/production builds to backend URLs via env"
```

---

### Task 6: Sentry observability (no-op without DSN)

**Files:**

- Create: `src/lib/sentry.ts`
- Test: `src/__tests__/lib/sentry.test.ts`
- Modify: `App.tsx` (init + wrap), `package.json` (dependency)

**Interfaces:**

- Produces: `initSentry(): boolean` (returns true if initialized, false when no DSN); `captureError(e: unknown, context?: Record<string, unknown>): void`; `wrapWithSentry(component)` — re-export of Sentry's wrap, identity when not initialized.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install @sentry/react-native`
Expected: adds `@sentry/react-native` to `package.json` dependencies.

- [ ] **Step 2: Write the failing test (no-op without DSN)**

```ts
// src/__tests__/lib/sentry.test.ts
jest.mock('@/config/env', () => ({ env: { SENTRY_DSN: '' } }));

import { initSentry } from '@/lib/sentry';

describe('initSentry', () => {
  it('returns false and does not initialize when no DSN is configured', () => {
    expect(initSentry()).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/sentry.test.ts`
Expected: FAIL — `Cannot find module '@/lib/sentry'`.

- [ ] **Step 4: Implement the wrapper**

```ts
// src/lib/sentry.ts
// Thin wrapper so the rest of the app never imports the SDK directly and so the
// whole thing is a no-op when no DSN is set (dev, tests, un-provisioned builds).
// We never send tokens/PII — only structured context passed by callers.
import * as Sentry from '@sentry/react-native';
import { env } from '@/config/env';

let initialized = false;

export function initSentry(): boolean {
  if (initialized || !env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableNativeCrashHandling: true,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
  initialized = true;
  return true;
}

export function captureError(e: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(e, context ? { extra: context } : undefined);
}

export function addBreadcrumb(category: string, data: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({ category, data, level: 'error' });
}

export const wrapWithSentry: <T>(c: T) => T = (c) =>
  initialized ? (Sentry.wrap(c as never) as T) : c;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/sentry.test.ts`
Expected: PASS.

- [ ] **Step 6: Initialize at app entry and wrap the root**

In `App.tsx`, add after the existing imports:

```ts
import { initSentry, wrapWithSentry } from './src/lib/sentry';

initSentry();
```

Change the default export so the component is wrapped. Rename the existing `export default function App()` to `function App()`, and at the bottom of the file add:

```ts
export default wrapWithSentry(App);
```

- [ ] **Step 7: Typecheck and full suite**

Run: `npx tsc --noEmit && npx jest --silent`
Expected: tsc clean; all tests pass (Sentry no-ops; `wrapWithSentry` is identity without a DSN).

- [ ] **Step 8: Commit**

```bash
git add src/lib/sentry.ts src/__tests__/lib/sentry.test.ts App.tsx package.json package-lock.json
git commit -m "feat(observability): add Sentry crash reporting (no-op without DSN)"
```

---

### Task 7: PII-safe error breadcrumb in the HTTP client

**Files:**

- Modify: `src/lib/httpClient.ts` (the `toError` path)
- Test: `src/__tests__/lib/httpClientBreadcrumb.test.ts` (create)

**Interfaces:**

- Consumes: `addBreadcrumb(category, data)` from Task 6.
- Produces: breadcrumbs of the exact shape `{ path, status, code }` on every non-OK response — no headers, no bodies.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/httpClientBreadcrumb.test.ts
const addBreadcrumb = jest.fn();
jest.mock('@/lib/sentry', () => ({ addBreadcrumb: (...a: unknown[]) => addBreadcrumb(...a) }));

import { createHttpClient } from '@/lib/httpClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as unknown as Response;
}

describe('httpClient error breadcrumb', () => {
  beforeEach(() => addBreadcrumb.mockClear());

  it('records a PII-free breadcrumb on a non-OK response', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(404, { error: { code: 'not_found', message: 'Missing' } })
    );
    const client = createHttpClient({
      baseUrl: 'https://x/v1',
      getAuth: () => ({ accessToken: 'secret-token', tenantId: 't1' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get('/classes')).rejects.toMatchObject({ status: 404 });
    expect(addBreadcrumb).toHaveBeenCalledWith('http', {
      path: '/classes',
      status: 404,
      code: 'not_found',
    });
    const reported = JSON.stringify(addBreadcrumb.mock.calls);
    expect(reported).not.toContain('secret-token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/httpClientBreadcrumb.test.ts`
Expected: FAIL — breadcrumb not called (assertion fails).

- [ ] **Step 3: Emit the breadcrumb from `toError`**

In `src/lib/httpClient.ts`, add to the imports at the top:

```ts
import { addBreadcrumb } from '@/lib/sentry';
```

The `toError` function builds `code`/`status`. Change the `request` function so the path is known when the error is built. Replace the final non-OK branch in `request` (currently `if (!res.ok) throw await toError(res);`) with:

```ts
if (!res.ok) {
  const err = await toError(res);
  addBreadcrumb('http', { path, status: err.status, code: err.code });
  throw err;
}
```

(Do the same for the refresh-failure throw at the 401 branch: after `config.onAuthLost?.();`, build the error, add the breadcrumb, then throw — mirror the shape `{ path, status, code }`.)

- [ ] **Step 4: Run test + full suite**

Run: `npx jest src/__tests__/lib/httpClientBreadcrumb.test.ts && npx jest --silent && npx tsc --noEmit`
Expected: new test PASS; existing httpClient tests still PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/httpClient.ts src/__tests__/lib/httpClientBreadcrumb.test.ts
git commit -m "feat(observability): PII-safe http error breadcrumbs (path/status/code only)"
```

---

### Task 8: Top-level error boundary, offline banner, mutation retry default

**Files:**

- Create: `src/components/AppErrorBoundary.tsx`
- Create: `src/components/OfflineBanner.tsx`
- Test: `src/__tests__/components/appErrorBoundary.test.tsx`
- Modify: `src/lib/queryClient.ts` (mutation defaults), `App.tsx` (mount boundary + banner), `package.json` (netinfo)

**Interfaces:**

- Consumes: `ErrorState` from `@/ui/state/ErrorState`; `captureError` from `@/lib/sentry`; `queryClient` from `@/lib/queryClient`.
- Produces: `<AppErrorBoundary>` (class component, resets query cache on retry); `<OfflineBanner />`.

- [ ] **Step 1: Install netinfo**

Run: `npx expo install @react-native-community/netinfo`
Expected: adds `@react-native-community/netinfo` to dependencies.

- [ ] **Step 2: Write the failing boundary test**

```tsx
// src/__tests__/components/appErrorBoundary.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('kaboom');
}

describe('AppErrorBoundary', () => {
  it('renders fallback when a child throws and recovers on retry', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const { getByText, queryByText, rerender } = render(
      <AppErrorBoundary>{shouldThrow ? <Boom /> : <Text>ok</Text>}</AppErrorBoundary>
    );
    expect(getByText(/something went wrong/i)).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(getByText(/retry/i));
    rerender(
      <AppErrorBoundary>
        <Text>ok</Text>
      </AppErrorBoundary>
    );
    expect(queryByText(/something went wrong/i)).toBeNull();
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/__tests__/components/appErrorBoundary.test.tsx`
Expected: FAIL — `Cannot find module '@/components/AppErrorBoundary'`.

- [ ] **Step 4: Implement the boundary**

```tsx
// src/components/AppErrorBoundary.tsx
import React from 'react';
import { ErrorState } from '@/ui/state/ErrorState';
import { captureError } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureError(error, { boundary: 'app-root' });
  }

  handleRetry = () => {
    queryClient.clear();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorState message="Something went wrong." onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/components/appErrorBoundary.test.tsx`
Expected: PASS.

- [ ] **Step 6: Implement the offline banner**

```tsx
// src/components/OfflineBanner.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '@/theme';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);
  if (!offline) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
```

> `NetInfo.addEventListener` returns an unsubscribe function, which `useEffect` uses as cleanup. Verify `Colors.absent`/`Colors.white` exist in `@/theme`; substitute the nearest red/white tokens if named differently.

- [ ] **Step 7: Set mutation retry default**

In `src/lib/queryClient.ts`, add a `mutations` block under `defaultOptions` (alongside the existing `queries`):

```ts
    mutations: {
      retry: 0,
    },
```

- [ ] **Step 8: Mount the boundary and banner in `App.tsx`**

Wrap the providers tree. Inside the `<SafeAreaProvider>`, wrap `<AppProviders>` with `<AppErrorBoundary>`, and render `<OfflineBanner />` just inside `<NavigationContainer>` above `<RootNavigator />`. Add imports:

```ts
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
```

Resulting tree fragment:

```tsx
<SafeAreaProvider>
  <AppErrorBoundary>
    <AppProviders>
      <NavigationContainer>
        <StatusBar style="auto" />
        <OfflineBanner />
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  </AppErrorBoundary>
</SafeAreaProvider>
```

> If `OfflineBanner` is exported from a `src/components/index.ts` barrel, add it there to match the existing import convention used by screens.

- [ ] **Step 9: Typecheck, lint, full suite**

Run: `npx tsc --noEmit && npm run lint && npx jest --silent`
Expected: tsc clean; lint clean; all tests pass (existing 55 + date(4) + env(6) + sentry(1) + breadcrumb(1) + boundary(1)).

- [ ] **Step 10: Commit**

```bash
git add src/components/AppErrorBoundary.tsx src/components/OfflineBanner.tsx src/__tests__/components/appErrorBoundary.test.tsx src/lib/queryClient.ts App.tsx package.json package-lock.json
git commit -m "feat(resilience): app-root error boundary, offline banner, no mutation retries"
```

---

## Final verification

- [ ] Run `npx tsc --noEmit` → clean.
- [ ] Run `npm run lint` → clean.
- [ ] Run `npx jest --silent` → all suites green (~68 tests).
- [ ] Manual smoke (dev build): open Attendance → date shows **today**, stepper back-dates but cannot go future; Home → header date is today, no fabricated Present/Absent pills, next-exam banner reflects a real exam or is hidden.
- [ ] Confirm with the project owner the real `preview`/`production` backend URLs and the Sentry DSN secret before the first `eas build --profile production`.
