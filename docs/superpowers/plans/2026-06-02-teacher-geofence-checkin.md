# Teacher Location-Based Check-In / Check-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher record a geofence-verified check-in and check-out each day; punches outside the school radius are still saved but flagged "unverified location".

**Architecture:** Follows the app's repository pattern — domain types → mock/http repos in the `Repositories` registry, react-query hooks in a feature folder, and screens that consume the hooks. A single `geofence` lib module wraps `expo-location` and holds the pure distance/verification math. The client computes verified-vs-flagged but stores raw `lat/lng/accuracy` so a real backend can re-verify later with no model change.

**Tech Stack:** Expo (React Native 0.81), TypeScript, `expo-location`, `@tanstack/react-query`, Jest + `@testing-library/react-native`, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-06-02-teacher-geofence-checkin-design.md`

---

## File Structure

**Create:**

- `src/lib/geofence.ts` — `expo-location` wrapper + `haversineMeters` + `evaluate` + `buildCheckEvent` + `todayISO`
- `src/data/mock/myAttendance.repo.ts` — hardcoded school location + in-memory day store
- `src/data/http/myAttendance.repo.ts` — stubbed live endpoints + DTO mappers
- `src/features/teacherAttendance/hooks.ts` — react-query hooks
- `src/screens/MyAttendanceScreen.tsx` — full screen on the Profile/Me tab
- `src/__tests__/lib/geofence.test.ts` — unit tests for the pure functions
- `src/__tests__/contracts/myAttendance.contract.test.ts` — mock + http contract
- `src/__tests__/features/myAttendanceHooks.test.tsx` — hook smoke test

**Modify:**

- `src/data/domain/index.ts` — new types
- `src/data/repositories/types.ts` — `MyAttendanceRepository` + registry entry
- `src/lib/queryClient.ts` — new query keys
- `src/data/mock/seed.ts` — `myAttendance` table + `SeedShape` field
- `src/data/repositories/factory.ts` — wire mock + http
- `src/__tests__/contracts/contract.ts` — `myAttendanceContract` helper
- `src/navigation/types.ts` — register `MyAttendanceScreen` in the Profile stack
- `src/navigation/MainTabNavigator.tsx` — add the screen to `ProfileStackNavigator`
- `src/screens/ProfileScreen.tsx` — menu row linking to the screen
- `src/screens/HomeScreen.tsx` — check-in/out card
- `app.json` — `expo-location` plugin + permission strings

---

## Task 1: Domain types

**Files:**

- Modify: `src/data/domain/index.ts` (append at end of file)

- [ ] **Step 1: Add the types**

Append to `src/data/domain/index.ts`:

```ts
// ─── Teacher self check-in (geofenced) ───────────────────────────────────────
export interface SchoolLocation {
  lat: number;
  lng: number;
  radiusMeters: number; // mock defaults to 10
  name: string;
}

export type CheckEventKind = 'in' | 'out';

export interface CheckEvent {
  kind: CheckEventKind;
  at: string; // ISO timestamp
  lat: number;
  lng: number;
  accuracyMeters: number; // GPS-reported accuracy
  distanceMeters: number; // computed distance to the school
  verified: boolean; // distance <= radius + min(accuracy, ACCURACY_CAP)
}

export interface TeacherAttendanceDay {
  date: string; // YYYY-MM-DD
  checkIn?: CheckEvent;
  checkOut?: CheckEvent;
}

export interface TeacherAttendanceSummary {
  daysPresent: number;
  daysFlagged: number; // days with any unverified punch
  totalHours: number; // sum of (checkOut - checkIn)
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (existing code unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/data/domain/index.ts
git commit -m "feat: add teacher geofence check-in domain types"
```

---

## Task 2: Install and configure expo-location

**Files:**

- Modify: `app.json:30-33` (the `plugins` array)
- Modify: `package.json` (added by the installer)

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-location`
Expected: `expo-location` added to `package.json` dependencies at an Expo-54-compatible version.

- [ ] **Step 2: Register the config plugin with permission copy**

Replace the `plugins` array in `app.json` (lines 30-33) with:

```json
    "plugins": [
      "expo-font",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow School Desk to use your location to verify you are at school when you check in."
        }
      ]
    ],
```

- [ ] **Step 3: Verify the project still resolves**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app.json package.json
git add package-lock.json yarn.lock pnpm-lock.yaml 2>$null  # whichever lockfile the installer updated
git commit -m "chore: add expo-location dependency and permission config"
```

---

## Task 3: Geofence pure functions + location wrapper

**Files:**

- Create: `src/lib/geofence.ts`
- Test: `src/__tests__/lib/geofence.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/geofence.test.ts`:

```ts
import { haversineMeters, evaluate, buildCheckEvent, ACCURACY_CAP } from '@/lib/geofence';
import type { SchoolLocation } from '@/data/domain';

const SCHOOL: SchoolLocation = { lat: 40.0, lng: -75.0, radiusMeters: 10, name: 'Test School' };

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineMeters({ lat: 40, lng: -75 }, { lat: 40, lng: -75 })).toBeCloseTo(0, 5);
  });

  it('approximates a known short distance', () => {
    // 0.001 deg of latitude ≈ 111.2 m
    const d = haversineMeters({ lat: 40.0, lng: -75.0 }, { lat: 40.001, lng: -75.0 });
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });
});

describe('evaluate', () => {
  it('verifies a point inside the bare radius', () => {
    const r = evaluate({ lat: 40.0, lng: -75.0, accuracyMeters: 0 }, SCHOOL);
    expect(r.distanceMeters).toBeCloseTo(0, 5);
    expect(r.verified).toBe(true);
  });

  it('verifies a point just outside radius but inside the accuracy buffer', () => {
    // ~22 m away, but accuracy 30 → buffer 10 + 30 = 40 ⇒ verified
    const r = evaluate({ lat: 40.0002, lng: -75.0, accuracyMeters: 30 }, SCHOOL);
    expect(r.distanceMeters).toBeGreaterThan(15);
    expect(r.verified).toBe(true);
  });

  it('flags a point well outside radius with good accuracy', () => {
    // ~111 m away, accuracy 5 → buffer 15 ⇒ flagged
    const r = evaluate({ lat: 40.001, lng: -75.0, accuracyMeters: 5 }, SCHOOL);
    expect(r.verified).toBe(false);
  });

  it('caps the accuracy buffer so a garbage fix cannot auto-verify', () => {
    // ~111 m away, accuracy 9999 → buffer capped at 10 + ACCURACY_CAP(50) = 60 ⇒ flagged
    const r = evaluate({ lat: 40.001, lng: -75.0, accuracyMeters: 9999 }, SCHOOL);
    expect(ACCURACY_CAP).toBe(50);
    expect(r.verified).toBe(false);
  });
});

describe('buildCheckEvent', () => {
  it('assembles a CheckEvent from a position and school', () => {
    const ev = buildCheckEvent('in', { lat: 40.0, lng: -75.0, accuracyMeters: 3 }, SCHOOL);
    expect(ev.kind).toBe('in');
    expect(ev.lat).toBe(40.0);
    expect(ev.lng).toBe(-75.0);
    expect(ev.accuracyMeters).toBe(3);
    expect(ev.verified).toBe(true);
    expect(typeof ev.at).toBe('string');
    expect(typeof ev.distanceMeters).toBe('number');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/lib/geofence.test.ts`
Expected: FAIL — `Cannot find module '@/lib/geofence'`.

- [ ] **Step 3: Implement `src/lib/geofence.ts`**

```ts
import * as Location from 'expo-location';
import { AppError } from '@/lib/errors';
import type { CheckEvent, CheckEventKind, SchoolLocation } from '@/data/domain';

/** Max GPS-accuracy value (m) added to the radius when deciding "verified". */
export const ACCURACY_CAP = 50;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Position extends LatLng {
  accuracyMeters: number;
}

const R = 6_371_000; // Earth radius in meters
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters between two coordinates. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance to the school plus whether the position counts as "at school". */
export function evaluate(
  pos: Position,
  school: SchoolLocation
): { distanceMeters: number; verified: boolean } {
  const distanceMeters = haversineMeters(pos, school);
  const buffer = Math.min(pos.accuracyMeters, ACCURACY_CAP);
  const verified = distanceMeters <= school.radiusMeters + buffer;
  return { distanceMeters, verified };
}

/** Build a CheckEvent for the given kind, stamping the current time. */
export function buildCheckEvent(
  kind: CheckEventKind,
  pos: Position,
  school: SchoolLocation
): CheckEvent {
  const { distanceMeters, verified } = evaluate(pos, school);
  return {
    kind,
    at: new Date().toISOString(),
    lat: pos.lat,
    lng: pos.lng,
    accuracyMeters: pos.accuracyMeters,
    distanceMeters,
    verified,
  };
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read the device's current position once, requesting foreground permission.
 * Throws AppError with codes: location_permission_denied | location_off | location_timeout.
 */
export async function getCurrentPosition(): Promise<Position> {
  let permission: Location.LocationPermissionResponse;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new AppError({
      code: 'location_off',
      status: 0,
      message: 'Location services are unavailable on this device.',
    });
  }
  if (permission.status !== 'granted') {
    throw new AppError({
      code: 'location_permission_denied',
      status: 0,
      message: 'Location permission is required to check in.',
    });
  }
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracyMeters: loc.coords.accuracy ?? ACCURACY_CAP,
    };
  } catch {
    throw new AppError({
      code: 'location_timeout',
      status: 0,
      message: "Couldn't get a location fix. Please try again.",
    });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/lib/geofence.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geofence.ts src/__tests__/lib/geofence.test.ts
git commit -m "feat: add geofence distance and verification helpers"
```

---

## Task 4: Repository interface, query keys, and seed table

**Files:**

- Modify: `src/data/repositories/types.ts:62-65` (after `AttendanceRepository`) and `:114-131` (registry)
- Modify: `src/lib/queryClient.ts:16-39`
- Modify: `src/data/mock/seed.ts` (imports, `SeedShape`, `seed` object)

- [ ] **Step 1: Add the repository interface and registry entry**

In `src/data/repositories/types.ts`, add the import to the existing type import block at the top (the `from '@/data/domain'` import list):

```ts
  SchoolLocation,
  CheckEvent,
  TeacherAttendanceDay,
  TeacherAttendanceSummary,
```

Then add this interface immediately after the `AttendanceRepository` interface (currently ends at line 65):

```ts
export interface MyAttendanceRepository {
  schoolLocation(): Promise<SchoolLocation>;
  today(): Promise<TeacherAttendanceDay>;
  history(limit: number): Promise<TeacherAttendanceDay[]>;
  summary(month: string): Promise<TeacherAttendanceSummary>; // 'YYYY-MM'
  punch(event: CheckEvent): Promise<TeacherAttendanceDay>;
}
```

And add this field to the `Repositories` interface (after `bus: BusRepository;`):

```ts
myAttendance: MyAttendanceRepository;
```

- [ ] **Step 2: Add query keys**

In `src/lib/queryClient.ts`, add to the `queryKeys` object (after the `bus*` keys, before the closing `}`):

```ts
  schoolLocation: (tenantId: string) => ['myAttendance', tenantId, 'school'] as const,
  myAttendanceToday: (tenantId: string) => ['myAttendance', tenantId, 'today'] as const,
  myAttendanceHistory: (tenantId: string, limit: number) =>
    ['myAttendance', tenantId, 'history', limit] as const,
  myAttendanceSummary: (tenantId: string, month: string) =>
    ['myAttendance', tenantId, 'summary', month] as const,
```

- [ ] **Step 3: Add the seed table**

In `src/data/mock/seed.ts`:

Add `TeacherAttendanceDay` to the domain import block at the top:

```ts
  TeacherAttendanceDay,
```

Add the field to the `SeedShape` interface (after `busBoarding: BoardingRecord[];`):

```ts
  myAttendance: TeacherAttendanceDay[];
```

Add the seeded data to the `seed` object (after the `busBoarding: [ ... ],` block, before the closing `};` of `seed`). Coordinates match the mock school location used in Task 5 (`40.0, -75.0`):

```ts
  myAttendance: [
    {
      date: '2026-05-28',
      checkIn: {
        kind: 'in',
        at: '2026-05-28T08:02:00.000Z',
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 6,
        distanceMeters: 4,
        verified: true,
      },
      checkOut: {
        kind: 'out',
        at: '2026-05-28T15:31:00.000Z',
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 6,
        distanceMeters: 5,
        verified: true,
      },
    },
    {
      date: '2026-05-29',
      checkIn: {
        kind: 'in',
        at: '2026-05-29T08:20:00.000Z',
        lat: 40.0009,
        lng: -75.0,
        accuracyMeters: 5,
        distanceMeters: 100,
        verified: false,
      },
      checkOut: {
        kind: 'out',
        at: '2026-05-29T15:10:00.000Z',
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 6,
        distanceMeters: 5,
        verified: true,
      },
    },
  ],
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: errors ONLY about `createMockRepositories` / `createHttpRepositories` missing the `myAttendance` property (those are wired in Task 7). No other errors. If you see errors elsewhere, fix them before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/types.ts src/lib/queryClient.ts src/data/mock/seed.ts
git commit -m "feat: add MyAttendanceRepository interface, query keys, and seed data"
```

---

## Task 5: Mock repository + contract helper + contract test (mock side)

**Files:**

- Create: `src/data/mock/myAttendance.repo.ts`
- Modify: `src/__tests__/contracts/contract.ts` (imports + new helper)
- Create: `src/__tests__/contracts/myAttendance.contract.test.ts`

- [ ] **Step 1: Add the contract helper**

In `src/__tests__/contracts/contract.ts`, add `MyAttendanceRepository` to the type import block at the top:

```ts
  MyAttendanceRepository,
```

Then append this exported function at the end of the file:

```ts
export function myAttendanceContract(name: string, make: () => Promise<MyAttendanceRepository>) {
  describe(`MyAttendanceRepository contract [${name}]`, () => {
    it('schoolLocation returns coordinates and a radius', async () => {
      const repo = await make();
      const loc = await repo.schoolLocation();
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lng).toBe('number');
      expect(typeof loc.radiusMeters).toBe('number');
      expect(typeof loc.name).toBe('string');
    });

    it('today returns a day object with a date string', async () => {
      const repo = await make();
      const day = await repo.today();
      expect(typeof day.date).toBe('string');
    });

    it('history returns an array no longer than the limit', async () => {
      const repo = await make();
      const list = await repo.history(5);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeLessThanOrEqual(5);
      for (const d of list) expect(typeof d.date).toBe('string');
    });

    it('summary returns numeric fields', async () => {
      const repo = await make();
      const s = await repo.summary('2026-05');
      expect(typeof s.daysPresent).toBe('number');
      expect(typeof s.daysFlagged).toBe('number');
      expect(typeof s.totalHours).toBe('number');
    });

    it('punch in then today reflects the check-in', async () => {
      const repo = await make();
      const now = new Date().toISOString();
      const ev = {
        kind: 'in' as const,
        at: now,
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 5,
        distanceMeters: 3,
        verified: true,
      };
      const day = await repo.punch(ev);
      expect(day.checkIn?.kind).toBe('in');
      const today = await repo.today();
      expect(today.checkIn?.at).toBe(now);
    });
  });
}
```

- [ ] **Step 2: Write the contract test (mock side only for now)**

Create `src/__tests__/contracts/myAttendance.contract.test.ts`:

```ts
import { myAttendanceContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

myAttendanceContract('mock', async () => mockMyAttendance(await createStore()));
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/__tests__/contracts/myAttendance.contract.test.ts`
Expected: FAIL — `Cannot find module '@/data/mock/myAttendance.repo'`.

- [ ] **Step 4: Implement the mock repository**

Create `src/data/mock/myAttendance.repo.ts`:

```ts
import type { MyAttendanceRepository } from '@/data/repositories/types';
import type { SchoolLocation, TeacherAttendanceDay, TeacherAttendanceSummary } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { todayISO } from '@/lib/geofence';

// Hardcoded for the mock. Swapped for a real per-school value via the http repo.
const SCHOOL: SchoolLocation = {
  lat: 40.0,
  lng: -75.0,
  radiusMeters: 10,
  name: 'School Desk Demo Campus',
};

function hoursBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

export function mockMyAttendance(store: Store): MyAttendanceRepository {
  function getDay(date: string): TeacherAttendanceDay {
    return store.tables.myAttendance.find((d) => d.date === date) ?? { date };
  }

  return {
    async schoolLocation() {
      await simulateLatency();
      return { ...SCHOOL };
    },

    async today() {
      await simulateLatency();
      return { ...getDay(todayISO()) };
    },

    async history(limit) {
      await simulateLatency();
      return [...store.tables.myAttendance]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit)
        .map((d) => ({ ...d }));
    },

    async summary(month) {
      await simulateLatency();
      const days = store.tables.myAttendance.filter((d) => d.date.startsWith(month));
      let daysPresent = 0;
      let daysFlagged = 0;
      let totalHours = 0;
      for (const d of days) {
        if (d.checkIn) daysPresent += 1;
        const flagged = d.checkIn?.verified === false || d.checkOut?.verified === false;
        if (flagged) daysFlagged += 1;
        if (d.checkIn && d.checkOut) totalHours += hoursBetween(d.checkIn.at, d.checkOut.at);
      }
      return { daysPresent, daysFlagged, totalHours: Math.round(totalHours * 10) / 10 };
    },

    async punch(event) {
      await simulateLatency();
      const date = event.at.slice(0, 10);
      const existing = getDay(date);
      const updated: TeacherAttendanceDay = {
        date,
        checkIn: event.kind === 'in' ? event : existing.checkIn,
        checkOut: event.kind === 'out' ? event : existing.checkOut,
      };
      store.tables.myAttendance = [
        ...store.tables.myAttendance.filter((d) => d.date !== date),
        updated,
      ];
      await store.persist('myAttendance');
      return { ...updated };
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/__tests__/contracts/myAttendance.contract.test.ts`
Expected: PASS (the `[mock]` describe block green).

- [ ] **Step 6: Commit**

```bash
git add src/data/mock/myAttendance.repo.ts src/__tests__/contracts/contract.ts src/__tests__/contracts/myAttendance.contract.test.ts
git commit -m "feat: add mock teacher-attendance repository with contract test"
```

---

## Task 6: HTTP repository + contract test (http side)

**Files:**

- Create: `src/data/http/myAttendance.repo.ts`
- Modify: `src/__tests__/contracts/myAttendance.contract.test.ts`

- [ ] **Step 1: Implement the http repository**

Create `src/data/http/myAttendance.repo.ts`:

```ts
import type { MyAttendanceRepository } from '@/data/repositories/types';
import type {
  CheckEvent,
  CheckEventKind,
  SchoolLocation,
  TeacherAttendanceDay,
  TeacherAttendanceSummary,
} from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';

interface SchoolLocationDTO {
  lat: number;
  lng: number;
  radius_meters: number;
  name: string;
}
interface CheckEventDTO {
  kind: CheckEventKind;
  at: string;
  lat: number;
  lng: number;
  accuracy_meters: number;
  distance_meters: number;
  verified: boolean;
}
interface TeacherAttendanceDayDTO {
  date: string;
  check_in?: CheckEventDTO;
  check_out?: CheckEventDTO;
}
interface TeacherAttendanceSummaryDTO {
  days_present: number;
  days_flagged: number;
  total_hours: number;
}

const toSchool = (d: SchoolLocationDTO): SchoolLocation => ({
  lat: d.lat,
  lng: d.lng,
  radiusMeters: d.radius_meters,
  name: d.name,
});
const toEvent = (d: CheckEventDTO): CheckEvent => ({
  kind: d.kind,
  at: d.at,
  lat: d.lat,
  lng: d.lng,
  accuracyMeters: d.accuracy_meters,
  distanceMeters: d.distance_meters,
  verified: d.verified,
});
const toDay = (d: TeacherAttendanceDayDTO): TeacherAttendanceDay => ({
  date: d.date,
  checkIn: d.check_in ? toEvent(d.check_in) : undefined,
  checkOut: d.check_out ? toEvent(d.check_out) : undefined,
});
const toSummary = (d: TeacherAttendanceSummaryDTO): TeacherAttendanceSummary => ({
  daysPresent: d.days_present,
  daysFlagged: d.days_flagged,
  totalHours: d.total_hours,
});
const fromEvent = (e: CheckEvent): CheckEventDTO => ({
  kind: e.kind,
  at: e.at,
  lat: e.lat,
  lng: e.lng,
  accuracy_meters: e.accuracyMeters,
  distance_meters: e.distanceMeters,
  verified: e.verified,
});

export function httpMyAttendance(http: HttpClient): MyAttendanceRepository {
  return {
    schoolLocation: () =>
      http.get<SchoolLocationDTO>('/me/attendance/school-location').then(toSchool),
    today: () => http.get<TeacherAttendanceDayDTO>('/me/attendance/today').then(toDay),
    history: (limit) =>
      http
        .get<TeacherAttendanceDayDTO[]>(`/me/attendance/history?limit=${limit}`)
        .then((d) => d.map(toDay)),
    summary: (month) =>
      http
        .get<TeacherAttendanceSummaryDTO>(`/me/attendance/summary?month=${month}`)
        .then(toSummary),
    punch: (event) =>
      http.post<TeacherAttendanceDayDTO>('/me/attendance/punch', fromEvent(event)).then(toDay),
  };
}
```

- [ ] **Step 2: Extend the contract test with the http fixture**

Replace the entire contents of `src/__tests__/contracts/myAttendance.contract.test.ts` with:

```ts
import { myAttendanceContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';
import { httpMyAttendance } from '@/data/http/myAttendance.repo';
import { createHttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mutable fixture so punch → today round-trips in the http contract.
let todayDay: { date: string; check_in?: unknown; check_out?: unknown } = {
  date: new Date().toISOString().slice(0, 10),
};

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  const ok = (body: unknown, status = 200): Response =>
    ({
      ok: true,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;

  if (method === 'POST' && urlStr.includes('/me/attendance/punch')) {
    const ev = JSON.parse(String(init?.body ?? '{}'));
    todayDay = {
      date: String(ev.at).slice(0, 10),
      check_in: ev.kind === 'in' ? ev : todayDay.check_in,
      check_out: ev.kind === 'out' ? ev : todayDay.check_out,
    };
    return ok(todayDay);
  }
  if (urlStr.includes('/me/attendance/school-location')) {
    return ok({ lat: 40.0, lng: -75.0, radius_meters: 10, name: 'HTTP School' });
  }
  if (urlStr.includes('/me/attendance/today')) {
    return ok(todayDay);
  }
  if (urlStr.includes('/me/attendance/history')) {
    return ok([{ date: '2026-05-28' }, { date: '2026-05-29' }]);
  }
  if (urlStr.includes('/me/attendance/summary')) {
    return ok({ days_present: 2, days_flagged: 1, total_hours: 14.5 });
  }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as Response;
}) as unknown as typeof fetch;

myAttendanceContract('mock', async () => mockMyAttendance(await createStore()));
myAttendanceContract('http', async () =>
  httpMyAttendance(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
```

- [ ] **Step 3: Run the test to verify both sides pass**

Run: `npx jest src/__tests__/contracts/myAttendance.contract.test.ts`
Expected: PASS — both `[mock]` and `[http]` describe blocks green.

- [ ] **Step 4: Commit**

```bash
git add src/data/http/myAttendance.repo.ts src/__tests__/contracts/myAttendance.contract.test.ts
git commit -m "feat: add http teacher-attendance repository and http contract"
```

---

## Task 7: Wire repositories into the factory

**Files:**

- Modify: `src/data/repositories/factory.ts`

- [ ] **Step 1: Add the imports**

In `src/data/repositories/factory.ts`, add after the bus imports (line 35):

```ts
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';
import { httpMyAttendance } from '@/data/http/myAttendance.repo';
```

- [ ] **Step 2: Register in both factories**

In `createMockRepositories`, add after `bus: mockBus(store),`:

```ts
    myAttendance: mockMyAttendance(store),
```

In `createHttpRepositories`, add after `bus: httpBus(http),`:

```ts
    myAttendance: httpMyAttendance(http),
```

- [ ] **Step 3: Verify the whole project type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (the `Repositories` registry is now fully satisfied).

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: PASS — all existing tests plus the new geofence and contract tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/factory.ts
git commit -m "feat: wire teacher-attendance repository into the factory"
```

---

## Task 8: Feature hooks

**Files:**

- Create: `src/features/teacherAttendance/hooks.ts`
- Test: `src/__tests__/features/myAttendanceHooks.test.tsx`

- [ ] **Step 1: Write the failing hook test**

Create `src/__tests__/features/myAttendanceHooks.test.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useSchoolLocation } from '@/features/teacherAttendance/hooks';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

const Probe = () => {
  const { data, isLoading } = useSchoolLocation();
  if (isLoading) return <Text>loading</Text>;
  return <Text>radius:{data?.radiusMeters ?? 'none'}</Text>;
};

it('useSchoolLocation returns the mock school radius', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('radius:10')).toBeTruthy());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/__tests__/features/myAttendanceHooks.test.tsx`
Expected: FAIL — `Cannot find module '@/features/teacherAttendance/hooks'`.

- [ ] **Step 3: Implement the hooks**

Create `src/features/teacherAttendance/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { getCurrentPosition, buildCheckEvent } from '@/lib/geofence';
import type { CheckEventKind } from '@/data/domain';

export function useSchoolLocation() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.schoolLocation(tenantId),
    queryFn: () => repos.myAttendance.schoolLocation(),
    staleTime: 60 * 60 * 1000, // 1 hour — school location rarely changes
  });
}

export function useMyAttendanceToday() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceToday(tenantId),
    queryFn: () => repos.myAttendance.today(),
  });
}

export function useMyAttendanceHistory(limit = 30) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceHistory(tenantId, limit),
    queryFn: () => repos.myAttendance.history(limit),
  });
}

export function useMyAttendanceSummary(month: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceSummary(tenantId, month),
    queryFn: () => repos.myAttendance.summary(month),
    enabled: month !== '',
  });
}

/**
 * Records a check-in or check-out: reads the current GPS position, builds a
 * geofence-evaluated CheckEvent, and persists it. Location/permission failures
 * surface as the mutation's error.
 */
export function usePunch() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (kind: CheckEventKind) => {
      const [school, pos] = await Promise.all([
        repos.myAttendance.schoolLocation(),
        getCurrentPosition(),
      ]);
      const event = buildCheckEvent(kind, pos, school);
      return repos.myAttendance.punch(event);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceToday(tenantId) });
      qc.invalidateQueries({ queryKey: ['myAttendance', tenantId, 'history'] });
      qc.invalidateQueries({ queryKey: ['myAttendance', tenantId, 'summary'] });
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/__tests__/features/myAttendanceHooks.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/teacherAttendance/hooks.ts src/__tests__/features/myAttendanceHooks.test.tsx
git commit -m "feat: add teacher-attendance react-query hooks"
```

---

## Task 9: My Attendance screen + navigation + Profile link

**Files:**

- Create: `src/screens/MyAttendanceScreen.tsx`
- Modify: `src/navigation/types.ts:52-57` (Profile stack params)
- Modify: `src/navigation/MainTabNavigator.tsx` (import + Profile stack screen)
- Modify: `src/screens/ProfileScreen.tsx:19-40` (menu item)

- [ ] **Step 1: Register the route type**

In `src/navigation/types.ts`, add to `ProfileStackParamList` (after `ProfileScreen: undefined;`):

```ts
MyAttendanceScreen: undefined;
```

- [ ] **Step 2: Create the screen**

Create `src/screens/MyAttendanceScreen.tsx`:

```tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { todayISO } from '@/lib/geofence';
import { isAppError } from '@/lib/errors';
import {
  useMyAttendanceToday,
  useMyAttendanceHistory,
  useMyAttendanceSummary,
  usePunch,
} from '@/features/teacherAttendance/hooks';
import type { CheckEvent, TeacherAttendanceDay } from '@/data/domain';

const timeOf = (e?: CheckEvent) =>
  e ? new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const dayFlagged = (d: TeacherAttendanceDay) =>
  d.checkIn?.verified === false || d.checkOut?.verified === false;

export const MyAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const month = todayISO().slice(0, 7);

  const { data: today, isLoading: todayLoading } = useMyAttendanceToday();
  const { data: history = [], isLoading: historyLoading } = useMyAttendanceHistory();
  const { data: summary } = useMyAttendanceSummary(month);
  const punch = usePunch();

  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const canCheckIn = !today?.checkIn;
  const canCheckOut = !!today?.checkIn && !today?.checkOut;

  const doPunch = (kind: 'in' | 'out') => {
    punch.mutate(kind, {
      onSuccess: (day) => {
        const ev = kind === 'in' ? day.checkIn : day.checkOut;
        const meters = ev ? Math.round(ev.distanceMeters) : 0;
        setToast({
          msg: ev?.verified
            ? `Checked ${kind} — ${meters} m from school ✓`
            : `Checked ${kind} — ${meters} m away, location flagged`,
          type: ev?.verified ? 'success' : 'error',
        });
      },
      onError: (e) => {
        const msg = isAppError(e) ? e.message : 'Something went wrong. Please try again.';
        setToast({ msg, type: 'error' });
      },
    });
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title="My Attendance" subtitle="Your daily check-in" showBack />
        </Animated.View>

        {/* Today */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Today</Text>
          {todayLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.timeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check In</Text>
                  <Text style={styles.timeValue}>{timeOf(today?.checkIn)}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check Out</Text>
                  <Text style={styles.timeValue}>{timeOf(today?.checkOut)}</Text>
                </View>
              </View>
              {(today?.checkOut ?? today?.checkIn) && (
                <Text style={styles.distanceHint}>
                  📍 {Math.round((today?.checkOut ?? today?.checkIn)!.distanceMeters)} m from school
                </Text>
              )}
              {today && dayFlagged(today) && (
                <View style={styles.flagBadge}>
                  <Ionicons name="warning-outline" size={13} color={Colors.absent} />
                  <Text style={styles.flagText}>Unverified location</Text>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, !canCheckIn && styles.actionBtnDisabled]}
                  disabled={!canCheckIn || punch.isPending}
                  onPress={() => doPunch('in')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionText}>Check In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, !canCheckOut && styles.actionBtnDisabled]}
                  disabled={!canCheckOut || punch.isPending}
                  onPress={() => doPunch('out')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionText}>Check Out</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>

        {/* Monthly summary */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.summaryRow}>
          {[
            { label: 'Present', value: String(summary?.daysPresent ?? '–') },
            { label: 'Flagged', value: String(summary?.daysFlagged ?? '–') },
            { label: 'Hours', value: String(summary?.totalHours ?? '–') },
          ].map((s) => (
            <View key={s.label} style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{s.value}</Text>
              <Text style={styles.summaryLbl}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {historyLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          history.map((d, i) => (
            <Animated.View
              key={d.date}
              entering={FadeInDown.delay(200 + i * 30).springify()}
              style={styles.historyRow}
            >
              <Text style={styles.historyDate}>{d.date}</Text>
              <Text style={styles.historyTimes}>
                {timeOf(d.checkIn)} – {timeOf(d.checkOut)}
              </Text>
              {dayFlagged(d) && <Ionicons name="warning-outline" size={14} color={Colors.absent} />}
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Toast
        visible={!!toast}
        message={toast?.msg ?? ''}
        type={toast?.type ?? 'success'}
        onHide={() => setToast(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 14 },
  card: { backgroundColor: Colors.card, borderRadius: Radii.md, padding: 16, ...Shadows.card },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 12 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeBox: {
    flex: 1,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  timeValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.primary,
    marginTop: 2,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  flagText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.absent },
  distanceHint: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 12,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnDisabled: { backgroundColor: Colors.primarySoft2 },
  actionText: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.white },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadows.card,
  },
  summaryNum: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  summaryLbl: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginTop: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    ...Shadows.card,
  },
  historyDate: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink, flex: 1 },
  historyTimes: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
});
```

- [ ] **Step 3: Register the screen in the Profile stack**

In `src/navigation/MainTabNavigator.tsx`, add the import after the `ProfileScreen` import (line 14):

```ts
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
```

Add the screen to `ProfileStackNavigator` (after the `ProfileScreen` screen, line 94):

```tsx
<ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
```

- [ ] **Step 4: Add the Profile menu row**

In `src/screens/ProfileScreen.tsx`, add as the FIRST entry of `MENU_ITEMS` (before `My Payslip`):

```ts
  {
    icon: 'time-outline',
    label: 'My Attendance',
    screen: 'MyAttendanceScreen',
    color: Colors.primary,
  },
```

- [ ] **Step 5: Verify type-check and tests**

Run: `npx tsc --noEmit && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/MyAttendanceScreen.tsx src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/screens/ProfileScreen.tsx
git commit -m "feat: add My Attendance screen with check-in/out and history"
```

---

## Task 10: Home check-in/out card

**Files:**

- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Add the hook imports**

In `src/screens/HomeScreen.tsx`, add after the existing feature-hook imports (after the `useAnnouncements` import, line 15):

```ts
import { useMyAttendanceToday, usePunch } from '@/features/teacherAttendance/hooks';
import { isAppError } from '@/lib/errors';
```

- [ ] **Step 2: Add state + hook calls in the component**

In the `HomeScreen` component body, after `const { data: announcements = [] } = useAnnouncements();` (line 65), add:

```ts
const { data: myToday } = useMyAttendanceToday();
const punch = usePunch();
const [punchToast, setPunchToast] = useState<string | null>(null);

const canCheckIn = !myToday?.checkIn;
const canCheckOut = !!myToday?.checkIn && !myToday?.checkOut;

const handlePunch = (kind: 'in' | 'out') => {
  punch.mutate(kind, {
    onSuccess: (day) => {
      const ev = kind === 'in' ? day.checkIn : day.checkOut;
      const meters = ev ? Math.round(ev.distanceMeters) : 0;
      setPunchToast(
        ev?.verified
          ? `Checked ${kind} — ${meters} m from school ✓`
          : `Checked ${kind} — ${meters} m away, flagged`
      );
    },
    onError: (e) => setPunchToast(isAppError(e) ? e.message : 'Could not check in. Try again.'),
  });
};
```

> Note: `useState` is already imported in this file (line 1). The `Toast` component is imported below in Step 3.

- [ ] **Step 3: Import Toast and render the card**

Update the components import (line 11) to include `Toast`:

```ts
import { Avatar, Card, Donut, SectionHeader, Toast } from '../components';
```

Insert this card JSX immediately after the "Upcoming Banner" `Animated.View` block (after its closing `</Animated.View>`, line 95) and before the "Attendance Card":

```tsx
{
  /* My Check-In / Check-Out */
}
<Animated.View entering={FadeInDown.delay(150).springify()}>
  <Card style={styles.myAttCard}>
    <View style={styles.myAttHeader}>
      <Ionicons name="location" size={16} color={Colors.primary} />
      <Text style={styles.myAttTitle}>My Attendance</Text>
      {myToday?.checkIn && (
        <Text style={styles.myAttStatus}>{myToday.checkOut ? 'Checked out' : 'Checked in'}</Text>
      )}
    </View>
    <View style={styles.myAttActions}>
      <TouchableOpacity
        style={[styles.myAttBtn, !canCheckIn && styles.myAttBtnDisabled]}
        disabled={!canCheckIn || punch.isPending}
        onPress={() => handlePunch('in')}
        activeOpacity={0.85}
      >
        <Text style={styles.myAttBtnText}>Check In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.myAttBtn, !canCheckOut && styles.myAttBtnDisabled]}
        disabled={!canCheckOut || punch.isPending}
        onPress={() => handlePunch('out')}
        activeOpacity={0.85}
      >
        <Text style={styles.myAttBtnText}>Check Out</Text>
      </TouchableOpacity>
    </View>
  </Card>
</Animated.View>;
```

Add the `Toast` as the last child of the screen's root `ScrollView` — place it immediately before the `</ScrollView>` closing tag:

```tsx
<Toast
  visible={!!punchToast}
  message={punchToast ?? ''}
  type="success"
  onHide={() => setPunchToast(null)}
/>
```

- [ ] **Step 4: Add the styles**

Add to the `StyleSheet.create({ ... })` object in `HomeScreen.tsx`:

```ts
  myAttCard: { marginTop: 12, padding: 16 },
  myAttHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  myAttTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, flex: 1 },
  myAttStatus: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.present },
  myAttActions: { flexDirection: 'row', gap: 12 },
  myAttBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  myAttBtnDisabled: { backgroundColor: Colors.primarySoft2 },
  myAttBtnText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white },
```

- [ ] **Step 5: Verify type-check and full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add quick check-in/out card to Home screen"
```

---

## Final Verification

- [ ] **Run the full suite and lint**

Run: `npx jest && npm run lint && npx tsc --noEmit`
Expected: all tests pass, no lint errors, no type errors.

- [ ] **Manual smoke (optional, requires device/emulator)**

Run: `npm run start`
Check: Home shows the "My Attendance" card with Check In enabled; the Me tab → "My Attendance" opens the full screen; checking in updates both; flagged punches show the warning badge.
