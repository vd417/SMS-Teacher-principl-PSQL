# Bus Duty Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Bus Duty" screen where a teacher sees their assigned school bus on a live map and marks/saves student boarding status.

**Architecture:** Follows the app's swappable mock/http repository pattern — domain types → `BusRepository` (mock + http) → react-query hooks → screen, wired through `factory.ts`/`seed.ts`/`queryKeys`. The map is a platform-split component: real Google Maps JS on web (keyed by env), with a stylized route-map fallback used on native and whenever no API key is present. Bus position is simulated (no real GPS).

**Tech Stack:** React Native (Expo) + react-native-web, TypeScript, @tanstack/react-query, react-native-svg + reanimated (already deps), `@react-google-maps/api` (new), Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-02-bus-duty-tracking-design.md`

---

### Task 0: Branch + dependency

**Files:** none (tooling)

- [ ] **Step 1: Create a feature branch**

```bash
git checkout -b feat/bus-duty-tracking
```

- [ ] **Step 2: Install the web map dependency**

```bash
npm install @react-google-maps/api
```

- [ ] **Step 3: Verify install and that the app still type-checks**

Run: `npx tsc --noEmit`
Expected: exits 0 (no type errors)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-google-maps/api for bus map"
```

---

### Task 1: Domain types

**Files:**

- Modify: `src/data/domain/index.ts` (append new types after `DashboardStats`)

- [ ] **Step 1: Add the bus domain types**

Append to the end of `src/data/domain/index.ts`:

```ts
export type BoardingStatus = 'pending' | 'boarded' | 'absent';

export interface BusStop {
  id: string;
  name: string;
  time: string; // scheduled time, e.g. "07:45"
  order: number;
  lat: number;
  lng: number;
}
export interface Bus {
  id: string;
  number: string; // e.g. "WBA-07"
  routeName: string; // e.g. "North Loop"
  driver: string;
  driverPhone: string;
  stops: BusStop[];
}
export interface BusPosition {
  busId: string;
  currentStopIndex: number; // index into stops[]
  progress: number; // 0..1 between currentStop and the next stop
  lat: number;
  lng: number;
  nextStopName: string;
  etaMinutes: number;
}
export interface BoardingRecord {
  studentId: string;
  studentName: string;
  initials: string;
  stopId: string;
  status: BoardingStatus;
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add src/data/domain/index.ts
git commit -m "feat: add bus domain types"
```

---

### Task 2: Query keys

**Files:**

- Modify: `src/lib/queryClient.ts` (add to the `queryKeys` object, after `dashboard`)

- [ ] **Step 1: Add bus query keys**

In `src/lib/queryClient.ts`, add these entries inside the `queryKeys` object (after the `dashboard` line):

```ts
  bus: (tenantId: string) => ['bus', tenantId] as const,
  busPosition: (tenantId: string, busId: string) => ['bus', tenantId, busId, 'position'] as const,
  busRoster: (tenantId: string, busId: string) => ['bus', tenantId, busId, 'roster'] as const,
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add src/lib/queryClient.ts
git commit -m "feat: add bus query keys"
```

---

### Task 3: Seed data + SeedShape

**Files:**

- Modify: `src/data/mock/seed.ts` (import types, extend `SeedShape`, add seed arrays)

- [ ] **Step 1: Add bus types to the seed import block**

In `src/data/mock/seed.ts`, add `Bus`, `BoardingRecord` to the existing type import from `@/data/domain`:

```ts
import type {
  Session,
  Class,
  Student,
  AttendanceRecord,
  TimetableSlot,
  Exam,
  GradeEntry,
  Assignment,
  ChatContact,
  ChatMessage,
  Announcement,
  CalendarEvent,
  LibraryBook,
  PayslipEntry,
  LeaveRequest,
  Bus,
  BoardingRecord,
} from '@/data/domain';
```

- [ ] **Step 2: Extend `SeedShape`**

Add these two fields to the `SeedShape` interface (after `leave: LeaveRequest[];`):

```ts
  buses: Bus[];
  busBoarding: BoardingRecord[];
```

- [ ] **Step 3: Add seed data**

Add these two properties to the `seed` object (after the `leave: [...]` array; mirror the existing comment-banner style):

```ts
  // ─── Buses ───────────────────────────────────────────────────────────────────
  buses: [
    {
      id: 'bus_north',
      number: 'WBA-07',
      routeName: 'North Loop',
      driver: 'Marcus Bell',
      driverPhone: '+1 (415) 555-0142',
      stops: [
        { id: 'stop_1', name: 'Westbrook Campus', time: '07:30', order: 0, lat: 37.7849, lng: -122.4094 },
        { id: 'stop_2', name: 'Oak Street', time: '07:42', order: 1, lat: 37.7799, lng: -122.4156 },
        { id: 'stop_3', name: 'Maple & 5th', time: '07:51', order: 2, lat: 37.7749, lng: -122.4194 },
        { id: 'stop_4', name: 'Riverside Park', time: '08:03', order: 3, lat: 37.7699, lng: -122.4244 },
        { id: 'stop_5', name: 'Hillcrest Gate', time: '08:14', order: 4, lat: 37.7649, lng: -122.4294 },
      ],
    },
  ],

  // ─── Bus boarding ──────────────────────────────────────────────────────────────
  busBoarding: [
    { studentId: 's1', studentName: 'Liam Carter', initials: 'LC', stopId: 'stop_2', status: 'pending' },
    { studentId: 's2', studentName: 'Sophia Nguyen', initials: 'SN', stopId: 'stop_2', status: 'pending' },
    { studentId: 's3', studentName: 'Noah Patel', initials: 'NP', stopId: 'stop_2', status: 'pending' },
    { studentId: 's4', studentName: 'Emma Davis', initials: 'ED', stopId: 'stop_3', status: 'pending' },
    { studentId: 's5', studentName: 'Olivia Brooks', initials: 'OB', stopId: 'stop_3', status: 'pending' },
    { studentId: 's6', studentName: 'Ava Mitchell', initials: 'AM', stopId: 'stop_3', status: 'pending' },
    { studentId: 's7', studentName: 'Ethan Reed', initials: 'ER', stopId: 'stop_4', status: 'pending' },
    { studentId: 's8', studentName: 'Mia Foster', initials: 'MF', stopId: 'stop_4', status: 'pending' },
    { studentId: 's9', studentName: 'Lucas Gray', initials: 'LG', stopId: 'stop_4', status: 'pending' },
    { studentId: 's10', studentName: 'Isabella Cruz', initials: 'IC', stopId: 'stop_5', status: 'pending' },
    { studentId: 's11', studentName: 'Mason Hughes', initials: 'MH', stopId: 'stop_5', status: 'pending' },
    { studentId: 's12', studentName: 'Charlotte Kim', initials: 'CK', stopId: 'stop_5', status: 'pending' },
  ],
```

- [ ] **Step 4: Verify type-check + existing seed test still pass**

Run: `npx tsc --noEmit && npm test -- seed`
Expected: type-check exits 0; seed test suite passes (if `seed.test.ts` asserts an exact set of table names, update it to include `buses` and `busBoarding`).

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/seed.ts src/__tests__/data/seed.test.ts
git commit -m "feat: seed bus route and boarding roster"
```

---

### Task 4: BusRepository interface

**Files:**

- Modify: `src/data/repositories/types.ts` (import types, add interface, add to `Repositories`)

- [ ] **Step 1: Add bus types to the import block**

In `src/data/repositories/types.ts`, add `Bus`, `BusPosition`, `BoardingRecord` to the existing `@/data/domain` import.

- [ ] **Step 2: Add the `BusRepository` interface**

Add after the `DashboardRepository` interface:

```ts
export interface BusRepository {
  assignedBus(): Promise<Bus>;
  position(busId: string): Promise<BusPosition>;
  roster(busId: string): Promise<BoardingRecord[]>;
  saveBoarding(busId: string, records: BoardingRecord[]): Promise<void>;
}
```

- [ ] **Step 3: Add `bus` to the `Repositories` interface**

Add `bus: BusRepository;` to the `Repositories` interface (after `dashboard: DashboardRepository;`).

- [ ] **Step 4: Verify type-check fails for the right reason**

Run: `npx tsc --noEmit`
Expected: FAILS — `factory.ts` no longer satisfies `Repositories` (missing `bus`). This confirms the interface is wired; Task 6 fixes it.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/types.ts
git commit -m "feat: add BusRepository interface"
```

---

### Task 5: Mock bus repository (TDD)

**Files:**

- Create: `src/data/mock/bus.repo.ts`
- Test: `src/__tests__/data/bus.repo.test.ts`

- [ ] **Step 1: Write the failing repo test**

Create `src/__tests__/data/bus.repo.test.ts`:

```ts
import { createStore } from '@/data/mock/store';
import { mockBus } from '@/data/mock/bus.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

it('assignedBus returns the seeded bus with stops', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  expect(bus.number).toBe('WBA-07');
  expect(bus.stops.length).toBeGreaterThan(1);
});

it('position advances progress and clamps at the last stop', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  const first = await repo.position(bus.id);
  expect(first.progress).toBeGreaterThan(0);
  let last = first;
  for (let i = 0; i < 30; i++) last = await repo.position(bus.id);
  expect(last.currentStopIndex).toBe(bus.stops.length - 1);
  expect(last.progress).toBeLessThanOrEqual(1);
  expect(typeof last.lat).toBe('number');
});

it('saveBoarding round-trips through roster', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  const roster = await repo.roster(bus.id);
  const updated = roster.map((r) => ({ ...r, status: 'boarded' as const }));
  await repo.saveBoarding(bus.id, updated);
  const after = await repo.roster(bus.id);
  expect(after.length).toBe(roster.length);
  for (const r of after) expect(r.status).toBe('boarded');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- bus.repo`
Expected: FAIL — `Cannot find module '@/data/mock/bus.repo'`

- [ ] **Step 3: Implement the mock repository**

Create `src/data/mock/bus.repo.ts`:

```ts
import type { BusRepository } from '@/data/repositories/types';
import type { BusPosition } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

const STEP = 0.34; // progress added per poll, so the marker visibly moves

export function mockBus(store: Store): BusRepository {
  // In-memory simulation state for the session (resets on reload).
  let stopIndex = 0;
  let progress = 0;

  return {
    async assignedBus() {
      await simulateLatency();
      const bus = store.tables.buses[0];
      if (!bus) throw new AppError({ code: 'not_found', status: 404, message: 'No bus assigned' });
      return bus;
    },

    async position(busId): Promise<BusPosition> {
      await simulateLatency();
      const bus = store.tables.buses.find((b) => b.id === busId) ?? store.tables.buses[0];
      const lastIndex = bus.stops.length - 1;

      // Advance the simulation.
      progress += STEP;
      if (progress >= 1) {
        if (stopIndex < lastIndex - 1) {
          stopIndex += 1;
          progress = 0;
        } else {
          stopIndex = lastIndex - 1 >= 0 ? lastIndex - 1 : 0;
          progress = 1; // arrived at final stop
        }
      }

      const from = bus.stops[stopIndex];
      const to = bus.stops[Math.min(stopIndex + 1, lastIndex)];
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      const currentStopIndex = progress >= 1 ? Math.min(stopIndex + 1, lastIndex) : stopIndex;

      return {
        busId: bus.id,
        currentStopIndex,
        progress,
        lat,
        lng,
        nextStopName: to.name,
        etaMinutes: Math.max(1, Math.round((1 - progress) * 8)),
      };
    },

    async roster(busId) {
      await simulateLatency();
      // Single-bus mock: roster is the whole busBoarding table.
      void busId;
      return store.tables.busBoarding.map((r) => ({ ...r }));
    },

    async saveBoarding(busId, records) {
      await simulateLatency();
      void busId;
      store.tables.busBoarding = records.map((r) => ({ ...r }));
      await store.persist('busBoarding');
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- bus.repo`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/bus.repo.ts src/__tests__/data/bus.repo.test.ts
git commit -m "feat: add mock bus repository with simulated position"
```

---

### Task 6: Http bus repository + factory wiring

**Files:**

- Create: `src/data/http/bus.repo.ts`
- Modify: `src/data/repositories/factory.ts`

- [ ] **Step 1: Implement the http repository**

Create `src/data/http/bus.repo.ts`:

```ts
import type { BusRepository } from '@/data/repositories/types';
import type { Bus, BusPosition, BoardingRecord, BoardingStatus } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';

interface BusStopDTO {
  id: string;
  name: string;
  time: string;
  order: number;
  lat: number;
  lng: number;
}
interface BusDTO {
  id: string;
  number: string;
  route_name: string;
  driver: string;
  driver_phone: string;
  stops: BusStopDTO[];
}
interface BusPositionDTO {
  bus_id: string;
  current_stop_index: number;
  progress: number;
  lat: number;
  lng: number;
  next_stop_name: string;
  eta_minutes: number;
}
interface BoardingRecordDTO {
  student_id: string;
  student_name: string;
  initials: string;
  stop_id: string;
  status: BoardingStatus;
}

const toBus = (d: BusDTO): Bus => ({
  id: d.id,
  number: d.number,
  routeName: d.route_name,
  driver: d.driver,
  driverPhone: d.driver_phone,
  stops: d.stops.map((s) => ({ ...s })),
});
const toPosition = (d: BusPositionDTO): BusPosition => ({
  busId: d.bus_id,
  currentStopIndex: d.current_stop_index,
  progress: d.progress,
  lat: d.lat,
  lng: d.lng,
  nextStopName: d.next_stop_name,
  etaMinutes: d.eta_minutes,
});
const toRecord = (d: BoardingRecordDTO): BoardingRecord => ({
  studentId: d.student_id,
  studentName: d.student_name,
  initials: d.initials,
  stopId: d.stop_id,
  status: d.status,
});

export function httpBus(http: HttpClient): BusRepository {
  return {
    assignedBus: () => http.get<BusDTO>('/bus/assigned').then(toBus),
    position: (busId) => http.get<BusPositionDTO>(`/bus/${busId}/position`).then(toPosition),
    roster: (busId) =>
      http.get<BoardingRecordDTO[]>(`/bus/${busId}/roster`).then((d) => d.map(toRecord)),
    saveBoarding: (busId, records) =>
      http
        .post<void>(`/bus/${busId}/boarding`, {
          records: records.map((r) => ({
            student_id: r.studentId,
            student_name: r.studentName,
            initials: r.initials,
            stop_id: r.stopId,
            status: r.status,
          })),
        })
        .then(() => undefined),
  };
}
```

> Note: confirm `HttpClient` exposes `.get`/`.post` (it does — see `src/data/http/attendance.repo.ts`). If `post` is named differently for PUT semantics, match the existing usage in that file.

- [ ] **Step 2: Wire both repos into the factory**

In `src/data/repositories/factory.ts`:

- Add imports near the other repo imports:

```ts
import { mockBus } from '@/data/mock/bus.repo';
import { httpBus } from '@/data/http/bus.repo';
```

- Add `bus: mockBus(store),` to `createMockRepositories` (after `dashboard: mockDashboard(store),`).
- Add `bus: httpBus(http),` to `createHttpRepositories` (after `dashboard: httpDashboard(http),`).

- [ ] **Step 3: Verify type-check passes (factory now satisfies Repositories)**

Run: `npx tsc --noEmit`
Expected: exits 0 (the Task 4 error is now resolved)

- [ ] **Step 4: Commit**

```bash
git add src/data/http/bus.repo.ts src/data/repositories/factory.ts
git commit -m "feat: add http bus repository and wire factory"
```

---

### Task 7: Bus contract test

**Files:**

- Modify: `src/__tests__/contracts/contract.ts` (add `busContract`)
- Create: `src/__tests__/contracts/bus.contract.test.ts`

- [ ] **Step 1: Add the contract helper**

In `src/__tests__/contracts/contract.ts`:

- Add `BusRepository` to the `@/data/repositories/types` import.
- Append this function:

```ts
export function busContract(name: string, make: () => Promise<BusRepository>) {
  describe(`BusRepository contract [${name}]`, () => {
    it('assignedBus returns a bus with stops', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      expect(typeof bus.id).toBe('string');
      expect(typeof bus.number).toBe('string');
      expect(Array.isArray(bus.stops)).toBe(true);
      expect(bus.stops.length).toBeGreaterThan(0);
      for (const s of bus.stops) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lng).toBe('number');
      }
    });

    it('position returns numeric coordinates and progress', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const pos = await repo.position(bus.id);
      expect(typeof pos.lat).toBe('number');
      expect(typeof pos.lng).toBe('number');
      expect(typeof pos.progress).toBe('number');
      expect(typeof pos.nextStopName).toBe('string');
    });

    it('roster returns boarding records with required fields', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const roster = await repo.roster(bus.id);
      expect(Array.isArray(roster)).toBe(true);
      expect(roster.length).toBeGreaterThan(0);
      for (const r of roster) {
        expect(typeof r.studentId).toBe('string');
        expect(typeof r.studentName).toBe('string');
        expect(typeof r.status).toBe('string');
      }
    });

    it('saveBoarding then roster reflects the new statuses', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const roster = await repo.roster(bus.id);
      const updated = roster.map((r) => ({ ...r, status: 'boarded' as const }));
      await repo.saveBoarding(bus.id, updated);
      const after = await repo.roster(bus.id);
      for (const r of after) expect(r.status).toBe('boarded');
    });
  });
}
```

- [ ] **Step 2: Write the contract test (mock + http), running it to confirm failure first**

Create `src/__tests__/contracts/bus.contract.test.ts`:

```ts
import { busContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockBus } from '@/data/mock/bus.repo';
import { httpBus } from '@/data/http/bus.repo';
import { createHttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const BUS = {
  id: 'bus_north',
  number: 'WBA-07',
  route_name: 'North Loop',
  driver: 'Marcus Bell',
  driver_phone: '+1 (415) 555-0142',
  stops: [
    { id: 'stop_1', name: 'Campus', time: '07:30', order: 0, lat: 37.78, lng: -122.4 },
    { id: 'stop_2', name: 'Oak Street', time: '07:42', order: 1, lat: 37.77, lng: -122.41 },
  ],
};
let rosterStore = [
  {
    student_id: 's1',
    student_name: 'Liam Carter',
    initials: 'LC',
    stop_id: 'stop_2',
    status: 'pending' as const,
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const u = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';
  const ok = (body: unknown, status = 200) =>
    ({
      ok: true,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;

  if (method !== 'GET' && u.includes('/boarding')) {
    const parsed = JSON.parse(String(init?.body ?? '{}'));
    rosterStore = parsed.records;
    return ok(null, 204);
  }
  if (u.includes('/bus/assigned')) return ok(BUS);
  if (u.includes('/position')) {
    return ok({
      bus_id: 'bus_north',
      current_stop_index: 0,
      progress: 0.5,
      lat: 37.775,
      lng: -122.405,
      next_stop_name: 'Oak Street',
      eta_minutes: 4,
    });
  }
  if (u.includes('/roster')) return ok(rosterStore);
  return { ok: false, status: 404, json: async () => ({}), text: async () => 'nf' } as Response;
}) as unknown as typeof fetch;

busContract('mock', async () => mockBus(await createStore()));
busContract('http', async () =>
  httpBus(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
```

Run: `npm test -- bus.contract`
Expected: PASS for both `mock` and `http` (the repos already exist from Tasks 5–6).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/contracts/contract.ts src/__tests__/contracts/bus.contract.test.ts
git commit -m "test: add bus repository contract tests"
```

---

### Task 8: Feature hooks (TDD)

**Files:**

- Create: `src/features/bus/hooks.ts`
- Test: `src/__tests__/features/busHooks.test.tsx`

- [ ] **Step 1: Write the failing hook test**

Create `src/__tests__/features/busHooks.test.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAssignedBus } from '@/features/bus/hooks';
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
  const { data, isLoading } = useAssignedBus();
  if (isLoading) return <Text>loading</Text>;
  return <Text>bus:{data?.number ?? 'none'}</Text>;
};

it('useAssignedBus returns the seeded bus', async () => {
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
  await waitFor(() => expect(screen.getByText('bus:WBA-07')).toBeTruthy());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- busHooks`
Expected: FAIL — `Cannot find module '@/features/bus/hooks'`

- [ ] **Step 3: Implement the hooks**

Create `src/features/bus/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { BoardingRecord } from '@/data/domain';

export function useAssignedBus() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.bus(tenantId),
    queryFn: () => repos.bus.assignedBus(),
  });
}

export function useBusPosition(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.busPosition(tenantId, busId),
    queryFn: () => repos.bus.position(busId),
    enabled: busId !== '',
    refetchInterval: 3000,
  });
}

export function useBusRoster(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.busRoster(tenantId, busId),
    queryFn: () => repos.bus.roster(busId),
    enabled: busId !== '',
  });
}

export function useSaveBoarding(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.busRoster(tenantId, busId);

  return useMutation({
    mutationFn: (records: BoardingRecord[]) => repos.bus.saveBoarding(busId, records),
    onMutate: async (records) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardingRecord[]>(key);
      qc.setQueryData<BoardingRecord[]>(key, () => records);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- busHooks`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/bus/hooks.ts src/__tests__/features/busHooks.test.tsx
git commit -m "feat: add bus react-query hooks"
```

---

### Task 9: Config — Google Maps API key

**Files:**

- Modify: `src/config/env.ts`

- [ ] **Step 1: Expose the key from env**

Replace the `env` object in `src/config/env.ts` with:

```ts
export const env = {
  DATA_SOURCE,
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.schooldesk.local',
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
} as const;
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add src/config/env.ts
git commit -m "feat: expose optional Google Maps API key from env"
```

---

### Task 10: Stylized route-map fallback component

**Files:**

- Create: `src/screens/bus/BusRouteFallback.tsx`

This is the always-available map: a vertical timeline of stops with the bus marker interpolated along `progress`. Used on native and on web when no API key is set. Rendering components aren't unit-tested here (the app has no component-render tests for screens); verified via type-check + manual run.

- [ ] **Step 1: Implement the fallback**

Create `src/screens/bus/BusRouteFallback.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

const ROW_HEIGHT = 64;

export const BusRouteFallback: React.FC<Props> = ({ bus, position }) => {
  const idx = position?.currentStopIndex ?? 0;
  const progress = position?.progress ?? 0;
  // Bus marker vertical offset: between current stop row and the next.
  const markerTop = (idx + Math.min(progress, 1)) * ROW_HEIGHT;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.busMarker, { top: markerTop }]}>
          <Ionicons name="bus" size={16} color={Colors.white} />
        </View>
      </View>
      <View style={styles.stops}>
        {bus.stops.map((stop, i) => {
          const passed = i < idx || (i === idx && progress >= 1);
          return (
            <View key={stop.id} style={[styles.stopRow, { height: ROW_HEIGHT }]}>
              <View style={[styles.dot, passed && styles.dotPassed]} />
              <View style={styles.stopText}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopTime}>{stop.time}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    padding: 16,
  },
  track: { width: 28, alignItems: 'center', position: 'relative' },
  busMarker: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    zIndex: 2,
  },
  stops: { flex: 1 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.rule, marginLeft: -22 },
  dotPassed: { backgroundColor: Colors.primary },
  stopText: { flex: 1 },
  stopName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  stopTime: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
});
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

> If `Colors` lacks `rule`/`primary`/`inkMuted`, open `src/theme/colors.ts` and substitute the nearest existing token (these names appear throughout existing screens, so they exist).

- [ ] **Step 3: Commit**

```bash
git add src/screens/bus/BusRouteFallback.tsx
git commit -m "feat: add stylized bus route fallback map"
```

---

### Task 11: Platform-split BusMap (native + web)

**Files:**

- Create: `src/screens/bus/BusMap.tsx` (native + default)
- Create: `src/screens/bus/BusMap.web.tsx` (web, Google Maps)

Metro resolves `.web.tsx` for web builds and `.tsx` for native automatically.

- [ ] **Step 1: Implement the native/default map (fallback only)**

Create `src/screens/bus/BusMap.tsx`:

```tsx
import React from 'react';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

export const BusMap: React.FC<Props> = ({ bus, position }) => (
  <BusRouteFallback bus={bus} position={position} />
);
```

- [ ] **Step 2: Implement the web map (Google Maps with fallback)**

Create `src/screens/bus/BusMap.web.tsx`:

```tsx
import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { env } from '@/config/env';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

const containerStyle = { width: '100%', height: '280px', borderRadius: '16px' };

export const BusMap: React.FC<Props> = ({ bus, position }) => {
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: 'bus-map',
    googleMapsApiKey: apiKey,
  });

  // No key (or not yet loaded) → stylized fallback so the screen never looks broken.
  if (!apiKey || !isLoaded) {
    return <BusRouteFallback bus={bus} position={position} />;
  }

  const center = position
    ? { lat: position.lat, lng: position.lng }
    : { lat: bus.stops[0].lat, lng: bus.stops[0].lng };

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      {bus.stops.map((s) => (
        <MarkerF key={s.id} position={{ lat: s.lat, lng: s.lng }} label={String(s.order + 1)} />
      ))}
      {position && (
        <MarkerF
          position={{ lat: position.lat, lng: position.lng }}
          icon={{
            path: 0 /* google.maps.SymbolPath.CIRCLE */,
            scale: 8,
            fillColor: '#4338CA',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }}
        />
      )}
    </GoogleMap>
  );
};
```

> Note: the bus marker uses a plain numeric `path: 0` to avoid referencing the `google` global at module load (it equals `google.maps.SymbolPath.CIRCLE`). If lint complains about the magic number, replace with `window.google.maps.SymbolPath.CIRCLE` guarded by `isLoaded`.

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/screens/bus/BusMap.tsx src/screens/bus/BusMap.web.tsx
git commit -m "feat: add platform-split bus map (google web + native fallback)"
```

---

### Task 12: BusScreen

**Files:**

- Create: `src/screens/BusScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/BusScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card, Avatar } from '../components';
import { BusMap } from './bus/BusMap';
import {
  useAssignedBus,
  useBusPosition,
  useBusRoster,
  useSaveBoarding,
} from '@/features/bus/hooks';
import type { BoardingRecord, BoardingStatus } from '@/data/domain';

const NEXT: Record<BoardingStatus, BoardingStatus> = {
  pending: 'boarded',
  boarded: 'absent',
  absent: 'pending',
};
const STATUS_COLOR: Record<BoardingStatus, string> = {
  pending: Colors.inkMuted,
  boarded: Colors.present,
  absent: Colors.absent,
};
const STATUS_ICON: Record<BoardingStatus, string> = {
  pending: 'ellipse-outline',
  boarded: 'checkmark-circle',
  absent: 'close-circle',
};

export const BusScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: bus } = useAssignedBus();
  const busId = bus?.id ?? '';
  const { data: position } = useBusPosition(busId);
  const { data: roster } = useBusRoster(busId);
  const save = useSaveBoarding(busId);

  const [draft, setDraft] = useState<BoardingRecord[]>([]);
  useEffect(() => {
    if (roster) setDraft(roster);
  }, [roster]);

  const cycle = (studentId: string) =>
    setDraft((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: NEXT[r.status] } : r))
    );

  const boardedCount = draft.filter((r) => r.status === 'boarded').length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Bus Duty" showBack />
      </Animated.View>

      {bus && (
        <>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card style={styles.busCard}>
              <View style={styles.busHeader}>
                <View style={styles.busIcon}>
                  <Ionicons name="bus" size={22} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.busNumber}>
                    {bus.number} · {bus.routeName}
                  </Text>
                  <Text style={styles.busDriver}>Driver: {bus.driver}</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Ionicons name="navigate" size={14} color={Colors.primary} />
                <Text style={styles.statusText}>
                  {position
                    ? `En route to ${position.nextStopName} · ~${position.etaMinutes} min`
                    : 'Locating bus…'}
                </Text>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.mapWrap}>
            <BusMap bus={bus} position={position} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.rosterSection}>
            <View style={styles.rosterHeader}>
              <Text style={styles.sectionTitle}>Boarding</Text>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryText}>
                  {boardedCount} / {draft.length} boarded
                </Text>
              </View>
            </View>
            <Card padding={0}>
              {draft.map((r, i) => (
                <TouchableOpacity
                  key={r.studentId}
                  style={[styles.row, i < draft.length - 1 && styles.rowBorder]}
                  onPress={() => cycle(r.studentId)}
                  activeOpacity={0.7}
                >
                  <Avatar initials={r.initials} size={36} />
                  <Text style={styles.rowName}>{r.studentName}</Text>
                  <Ionicons
                    name={STATUS_ICON[r.status] as never}
                    size={22}
                    color={STATUS_COLOR[r.status]}
                  />
                </TouchableOpacity>
              ))}
            </Card>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => save.mutate(draft)}
              disabled={save.isPending}
              activeOpacity={0.85}
            >
              <Text style={styles.saveLabel}>{save.isPending ? 'Saving…' : 'Save Boarding'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20 },
  busCard: { marginTop: 8 },
  busHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  busIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busNumber: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  busDriver: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  statusText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.primary },
  mapWrap: { marginTop: 16 },
  rosterSection: { marginTop: 24 },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  summaryPill: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  summaryText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.ruleSoft },
  rowName: { flex: 1, fontFamily: FontFamily.medium, fontSize: 15, color: Colors.ink },
  saveBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveLabel: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.white },
});
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

> If `Avatar` requires props other than `initials`/`size`, check `src/components/ui/Avatar.tsx` and adjust (ProfileScreen uses `<Avatar initials=... size=... />`).

- [ ] **Step 3: Commit**

```bash
git add src/screens/BusScreen.tsx
git commit -m "feat: add BusScreen with live map and boarding roster"
```

---

### Task 13: Navigation wiring

**Files:**

- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/MainTabNavigator.tsx`
- Modify: `src/screens/MoreScreen.tsx`

- [ ] **Step 1: Add the route param**

In `src/navigation/types.ts`, add to `HomeStackParamList` (after `MoreScreen: undefined;`):

```ts
BusScreen: undefined;
```

- [ ] **Step 2: Register the screen**

In `src/navigation/MainTabNavigator.tsx`:

- Add the import near the other screen imports:

```ts
import { BusScreen } from '../screens/BusScreen';
```

- Add inside `HomeStackNavigator`'s `<HomeStack.Navigator>` (after the `MoreScreen` screen):

```tsx
<HomeStack.Screen name="BusScreen" component={BusScreen} />
```

- [ ] **Step 3: Add the More-grid tile**

In `src/screens/MoreScreen.tsx`, add to the `MORE_ITEMS` array (append a new entry):

```ts
  {
    icon: 'bus-outline',
    label: 'Bus Duty',
    screen: 'BusScreen',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/screens/MoreScreen.tsx
git commit -m "feat: wire Bus Duty into navigation and More grid"
```

---

### Task 14: Full verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including `bus.repo`, `bus.contract`, `busHooks`.

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: lint clean (no new errors), type-check exits 0.

- [ ] **Step 3: Manual run in Chrome**

The dev server runs via `npm run web` (http://localhost:8081). Hard-refresh, log in, then **More → Bus Duty**. Confirm:

- Bus card shows "WBA-07 · North Loop", driver, and a status line that updates (~every 3s).
- Without a key: stylized vertical route map renders; the bus marker advances down the stops over time.
- Tapping a student cycles Pending → Boarded → Absent; the "X / 12 boarded" summary updates.
- Tapping **Save Boarding** shows "Saving…", and revisiting the screen preserves the saved statuses.
- (Optional) Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`, restart `npm run web`, and confirm the real Google map renders with stop markers and a moving bus marker.

- [ ] **Step 4: Final commit (if any lint fixes were made)**

```bash
git add -A
git commit -m "chore: bus duty final lint/verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** domain types (T1), queryKeys (T2), seed (T3), `BusRepository` interface (T4), mock repo (T5), http repo + factory (T6), contract test (T7), hooks (T8), env key (T9), fallback map (T10), platform-split Google map (T11), screen (T12), navigation + More tile (T13), verification (T14). All spec sections mapped.
- **Type consistency:** `Bus`/`BusStop`/`BusPosition`/`BoardingRecord`/`BoardingStatus` names and field names are identical across domain, repos, hooks, components, and screen. `saveBoarding(busId, records)` signature consistent everywhere.
- **Assumptions to verify during execution (flagged inline):** exact theme token names in `colors.ts`; `Avatar`/`Card`/`ScreenHeader` prop shapes; whether `seed.test.ts` asserts an exact table-name set (update if so); `HttpClient` method names for the boarding write.
