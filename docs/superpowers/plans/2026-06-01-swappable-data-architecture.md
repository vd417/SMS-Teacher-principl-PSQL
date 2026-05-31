# Swappable Data Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all 24 screens of the teacher app through a swappable data-access layer — mock data today, live REST API later via a one-line config flip — with full CRUD, optimistic updates, SaaS auth, and contract tests proving the mock and live adapters stay reconcilable.

**Architecture:** Ports & adapters. Each domain has a typed `*Repository` interface. Two implementations — a Mock adapter (in-memory store seeded from current fixtures, persisted to AsyncStorage, simulated latency) and an Http adapter (REST + DTO mappers) — are selected by a factory from one env flag. TanStack Query hooks call repositories via React context; screens only ever touch hooks.

**Tech Stack:** React Native (Expo 54), TypeScript (strict), TanStack Query v5, AsyncStorage, Expo SecureStore, Jest + jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-01-teacher-app-data-architecture-design.md`

---

## Conventions used throughout

- Path alias `@/*` → `./src/*` is already configured in `tsconfig.json`. Use it in new code.
- Domain types live in `src/data/domain/` and carry **no presentation fields** (no `color`, `colorSoft`, `colorTint`, `avatarColor`). Existing presentation types stay in `src/types/index.ts` until a screen is migrated, then the screen derives colors via `src/theme/derive.ts` (Task 6).
- Every test file sits next to nothing — tests go under `src/__tests__/**` mirroring the source path, per jest-expo default discovery (`**/*.test.ts(x)`).
- Commit after every green test. Commit messages use Conventional Commits.

---

## File Structure

**Phase 0 — Infrastructure (Tasks 1–8)**
- Create `src/config/env.ts` — `DATA_SOURCE`, `API_BASE_URL`.
- Create `src/lib/errors.ts` — `AppError`, `isAppError`.
- Create `src/lib/latency.ts` — `simulateLatency`, `maybeFail`.
- Create `src/lib/asyncStore.ts` — typed AsyncStorage JSON helpers.
- Create `src/lib/tokenStore.ts` — SecureStore access/refresh token helpers.
- Create `src/lib/httpClient.ts` — fetch wrapper (base URL, auth + tenant headers, error normalize, 401 refresh).
- Create `src/lib/queryClient.ts` — TanStack Query client + `queryKeys` helper.
- Create `src/theme/derive.ts` — deterministic color derivation (replaces data-borne colors).
- Create `src/data/domain/*.ts` — pure domain types.

**Phase 1 — Repository contracts, adapters wiring, providers (Tasks 9–14)**
- Create `src/data/repositories/types.ts` — all `*Repository` interfaces + `Repositories` bundle + input types.
- Create `src/data/mock/seed.ts` — fixtures moved from `src/data/index.ts`, color-stripped.
- Create `src/data/mock/store.ts` — in-memory tables + hydrate/persist.
- Create `src/data/repositories/factory.ts` — builds mock or http bundle from env.
- Create `src/data/repositories/RepositoryContext.tsx` — provider + `useRepositories()`.
- Create `src/providers/AppProviders.tsx` — QueryClient + Repository + Auth providers.
- Create `src/ui/state/{Skeleton,ErrorState,EmptyState}.tsx` — shared UI states.

**Phase 2 — Auth vertical slice (Tasks 15–19)**
- Create `src/data/mock/auth.repo.ts`, `src/data/http/auth.repo.ts`, `src/data/http/mappers.ts`.
- Create `src/features/auth/AuthProvider.tsx`, `src/features/auth/hooks.ts`.
- Modify `src/navigation/RootNavigator.tsx` — auth-gated.
- Modify `src/screens/LoginScreen.tsx` — call `useLogin`.

**Phase 3 — Canonical domain: Classes + Students (Tasks 20–27)**
- Create per-domain mock repo, http repo, hooks; migrate screens.

**Phase 4 — Remaining 13 domains (Task 28, templated with spec table)**

---

## Phase 0 — Infrastructure

### Task 1: Project setup — dependencies & test runner

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `src/__tests__/smoke.test.ts`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
npx expo install @tanstack/react-query @react-native-async-storage/async-storage expo-secure-store
npm install -D jest jest-expo @testing-library/react-native @types/jest
```
Expected: installs succeed, `package.json` updated.

- [ ] **Step 2: Add jest config**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|@tanstack/.*|react-native-.*)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
```

- [ ] **Step 3: Add test script**

In `package.json` `"scripts"`, add:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Write smoke test**

Create `src/__tests__/smoke.test.ts`:
```ts
describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test -- smoke`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js src/__tests__/smoke.test.ts
git commit -m "chore: add TanStack Query, storage deps and jest test runner"
```

---

### Task 2: Config — env flag

**Files:**
- Create: `src/config/env.ts`
- Test: `src/__tests__/config/env.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/config/env.test.ts`:
```ts
import { env } from '@/config/env';

describe('env', () => {
  it('defaults DATA_SOURCE to mock', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes an API_BASE_URL string', () => {
    expect(typeof env.API_BASE_URL).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- config/env`
Expected: FAIL — cannot find module `@/config/env`.

- [ ] **Step 3: Write minimal implementation**

Create `src/config/env.ts`:
```ts
export type DataSource = 'mock' | 'live';

const raw = process.env.EXPO_PUBLIC_DATA_SOURCE;
const DATA_SOURCE: DataSource = raw === 'live' ? 'live' : 'mock';

export const env = {
  DATA_SOURCE,
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.schooldesk.local',
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- config/env`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts src/__tests__/config/env.test.ts
git commit -m "feat: add env config with DATA_SOURCE flag"
```

---

### Task 3: Errors — AppError

**Files:**
- Create: `src/lib/errors.ts`
- Test: `src/__tests__/lib/errors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/errors.test.ts`:
```ts
import { AppError, isAppError } from '@/lib/errors';

describe('AppError', () => {
  it('carries code, status and message', () => {
    const e = new AppError({ code: 'not_found', status: 404, message: 'nope' });
    expect(e.code).toBe('not_found');
    expect(e.status).toBe(404);
    expect(e.message).toBe('nope');
  });
  it('isAppError narrows correctly', () => {
    expect(isAppError(new AppError({ code: 'x', status: 500, message: 'y' }))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/errors`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/errors.ts`:
```ts
export interface AppErrorShape {
  code: string;
  status: number;
  message: string;
}

export class AppError extends Error {
  code: string;
  status: number;
  constructor({ code, status, message }: AppErrorShape) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/errors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts src/__tests__/lib/errors.test.ts
git commit -m "feat: add typed AppError"
```

---

### Task 4: Mock latency & failure helpers

**Files:**
- Create: `src/lib/latency.ts`
- Test: `src/__tests__/lib/latency.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/latency.test.ts`:
```ts
import { simulateLatency, maybeFail } from '@/lib/latency';
import { AppError } from '@/lib/errors';

describe('latency helpers', () => {
  it('simulateLatency resolves', async () => {
    await expect(simulateLatency(0)).resolves.toBeUndefined();
  });
  it('maybeFail(1) always throws AppError', () => {
    expect(() => maybeFail(1)).toThrow(AppError);
  });
  it('maybeFail(0) never throws', () => {
    expect(() => maybeFail(0)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/latency`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/latency.ts`:
```ts
import { AppError } from './errors';

const DEFAULT_MIN = 150;
const DEFAULT_MAX = 500;

export function simulateLatency(ms?: number): Promise<void> {
  const delay = ms ?? DEFAULT_MIN + Math.random() * (DEFAULT_MAX - DEFAULT_MIN);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Throws an AppError with probability `p` (0..1). Used to exercise error paths. */
export function maybeFail(p = 0): void {
  if (Math.random() < p) {
    throw new AppError({ code: 'mock_failure', status: 500, message: 'Simulated failure' });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/latency`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/latency.ts src/__tests__/lib/latency.test.ts
git commit -m "feat: add mock latency and failure helpers"
```

---

### Task 5: AsyncStorage JSON helpers

**Files:**
- Create: `src/lib/asyncStore.ts`
- Test: `src/__tests__/lib/asyncStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/asyncStore.test.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readJson, writeJson } from '@/lib/asyncStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('asyncStore', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns fallback when key missing', async () => {
    expect(await readJson('missing', { a: 1 })).toEqual({ a: 1 });
  });
  it('round-trips a value', async () => {
    await writeJson('k', { hello: 'world' });
    expect(await readJson('k', null)).toEqual({ hello: 'world' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/asyncStore`
Expected: FAIL — cannot find module `@/lib/asyncStore`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/asyncStore.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/asyncStore`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asyncStore.ts src/__tests__/lib/asyncStore.test.ts
git commit -m "feat: add typed AsyncStorage JSON helpers"
```

---

### Task 6: Color derivation (replaces data-borne presentation)

**Files:**
- Create: `src/theme/derive.ts`
- Test: `src/__tests__/theme/derive.test.ts`

Context: today records carry `color`/`colorSoft`/`colorTint`. The live API won't. This module
derives a stable color set from an id so the UI looks identical without presentation in data.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/theme/derive.test.ts`:
```ts
import { deriveColorSet } from '@/theme/derive';

describe('deriveColorSet', () => {
  it('is deterministic for the same id', () => {
    expect(deriveColorSet('c1')).toEqual(deriveColorSet('c1'));
  });
  it('returns color, colorSoft, colorTint strings', () => {
    const set = deriveColorSet('c1');
    expect(typeof set.color).toBe('string');
    expect(typeof set.colorSoft).toBe('string');
    expect(typeof set.colorTint).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- theme/derive`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/theme/derive.ts`:
```ts
import { Colors } from './colors';

export interface ColorSet {
  color: string;
  colorSoft: string;
  colorTint: string;
}

const PALETTE: ColorSet[] = [
  { color: Colors.pink, colorSoft: Colors.pinkSoft, colorTint: Colors.pinkTint },
  { color: Colors.coral, colorSoft: Colors.coralSoft, colorTint: Colors.coralTint },
  { color: Colors.blue, colorSoft: Colors.blueSoft, colorTint: Colors.blueTint },
  { color: Colors.teal, colorSoft: Colors.tealSoft, colorTint: Colors.tealTint },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function deriveColorSet(id: string): ColorSet {
  return PALETTE[hash(id) % PALETTE.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- theme/derive`
Expected: PASS.

> Note: if `src/theme/colors.ts` lacks any of the referenced keys, open it first and use the
> nearest existing tokens. The plan assumes the four palette families seen in `src/data/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/theme/derive.ts src/__tests__/theme/derive.test.ts
git commit -m "feat: derive UI color sets from id (remove presentation from data)"
```

---

### Task 7: Domain types (color-stripped)

**Files:**
- Create: `src/data/domain/index.ts`
- Test: `src/__tests__/data/domain.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/domain.test.ts`:
```ts
import type { Class, Exam, Session, User, Tenant } from '@/data/domain';

describe('domain types', () => {
  it('Class has no presentation fields (compile-time + shape)', () => {
    const c: Class = { id: 'c1', name: 'Grade 9', section: 'A', subject: 'Math', studentCount: 32, room: 'R214' };
    expect(Object.keys(c)).not.toContain('color');
  });
  it('Session bundles tokens, user and tenant', () => {
    const s: Session = {
      accessToken: 'a', refreshToken: 'r',
      user: { id: 'u1', name: 'Aanya', role: 'teacher' } as User,
      tenant: { id: 't1', name: 'Westbrook' } as Tenant,
    };
    expect(s.tenant.id).toBe('t1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/domain`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/domain/index.ts` (mirrors `src/types/index.ts` minus presentation; adds auth types):
```ts
export type AttendanceStatus = 'P' | 'A' | 'L' | 'V';
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export type ExamStatus = 'upcoming' | 'completed' | 'draft';
export type AssignmentStatus = 'active' | 'due_soon' | 'overdue' | 'closed';
export type AnnouncementType = 'info' | 'warning' | 'event' | 'urgent';
export type EventType = 'exam' | 'holiday' | 'meeting' | 'event' | 'deadline';
export type LeaveType = 'casual' | 'sick' | 'emergency' | 'other';
export type LeaveStatus = 'approved' | 'pending' | 'rejected';
export type BookStatus = 'available' | 'issued' | 'overdue';
export type PayslipStatus = 'paid' | 'pending';
export type Role = 'teacher';

export interface Tenant { id: string; name: string; }
export interface User { id: string; name: string; initials: string; title: string; email: string; phone: string; employee: string; classroom: string; joined: string; role: Role; }
export interface Session { accessToken: string; refreshToken: string; user: User; tenant: Tenant; }

export interface Class { id: string; name: string; section: string; subject: string; studentCount: number; room: string; nextPeriod?: string; }
export interface Student { id: string; name: string; roll: string; initials: string; classId: string; attendance: number; grade: string; parent: string; parentPhone: string; }
export interface AttendanceRecord { studentId: string; status: AttendanceStatus; date: string; }
export interface TimetableSlot { id: string; day: WeekDay; period: number; subject: string; classId: string; className: string; room: string; startTime: string; endTime: string; }
export interface Exam { id: string; title: string; classId: string; className: string; subject: string; date: string; time: string; duration: number; maxMarks: number; topics: string[]; status: ExamStatus; }
export interface GradeEntry { studentId: string; studentName: string; examId: string; marks: number; maxMarks: number; grade: string; }
export interface Assignment { id: string; title: string; classId: string; className: string; subject: string; dueDate: string; submissionsCount: number; totalStudents: number; status: AssignmentStatus; }
export interface ChatContact { id: string; name: string; role: string; initials: string; lastMessage: string; time: string; unread: number; online: boolean; }
export interface ChatMessage { id: string; senderId: string; text: string; time: string; isMe: boolean; }
export interface Announcement { id: string; title: string; body: string; date: string; from: string; type: AnnouncementType; pinned?: boolean; }
export interface CalendarEvent { id: string; title: string; date: string; time?: string; type: EventType; description?: string; }
export interface LibraryBook { id: string; title: string; author: string; subject: string; issuedTo?: string; dueDate?: string; status: BookStatus; }
export interface PayslipEntry { id: string; month: string; year: number; gross: number; deductions: number; net: number; status: PayslipStatus; }
export interface LeaveRequest { id: string; type: LeaveType; from: string; to: string; reason: string; substitute?: string; status: LeaveStatus; appliedOn: string; }
export interface DashboardStats { totalStudents: number; totalClasses: number; attendanceToday: number; pendingAssignments: number; upcomingExams: number; }
```

Note vs. legacy `src/types`: presentation fields removed; `students:number`→`studentCount`; `PayslipEntry` gains an `id`; `Teacher` becomes `User` with `role`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/domain`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/domain/index.ts src/__tests__/data/domain.test.ts
git commit -m "feat: add color-stripped domain types with auth/session"
```

---

### Task 8: Token store (SecureStore)

**Files:**
- Create: `src/lib/tokenStore.ts`
- Test: `src/__tests__/lib/tokenStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/tokenStore.test.ts`:
```ts
import { tokenStore } from '@/lib/tokenStore';

const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mem[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mem[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete mem[k]; }),
}));

describe('tokenStore', () => {
  beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; });

  it('saves and reads tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    expect(await tokenStore.read()).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });
  it('clears tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    await tokenStore.clear();
    expect(await tokenStore.read()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tokenStore`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/tokenStore.ts`:
```ts
import * as SecureStore from 'expo-secure-store';

export interface Tokens { accessToken: string; refreshToken: string; }
const ACCESS = 'sd.accessToken';
const REFRESH = 'sd.refreshToken';

export const tokenStore = {
  async read(): Promise<Tokens | null> {
    const accessToken = await SecureStore.getItemAsync(ACCESS);
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },
  async save(t: Tokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS, t.accessToken);
    await SecureStore.setItemAsync(REFRESH, t.refreshToken);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/tokenStore`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokenStore.ts src/__tests__/lib/tokenStore.test.ts
git commit -m "feat: add SecureStore token store"
```

---

## Phase 1 — Contracts, adapters wiring, providers

### Task 9: HTTP client

**Files:**
- Create: `src/lib/httpClient.ts`
- Test: `src/__tests__/lib/httpClient.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/httpClient.test.ts`:
```ts
import { createHttpClient } from '@/lib/httpClient';
import { AppError } from '@/lib/errors';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

describe('httpClient', () => {
  it('attaches auth and tenant headers from the provider', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ ok: true }));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 'tok', tenantId: 'school1' }),
      fetchImpl: fetchMock,
    });
    await http.get('/classes');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/classes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect((init.headers as Record<string, string>)['X-Tenant-Id']).toBe('school1');
  });

  it('normalizes non-2xx to AppError', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ message: 'bad' }, 404));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await expect(http.get('/x')).rejects.toBeInstanceOf(AppError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/httpClient`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/httpClient.ts`:
```ts
import { AppError } from './errors';

export interface AuthSnapshot { accessToken: string | null; tenantId: string | null; }
export interface HttpClientConfig {
  baseUrl: string;
  getAuth: () => AuthSnapshot;
  fetchImpl?: typeof fetch;
}
export interface RequestOptions { params?: Record<string, unknown>; }

export interface HttpClient {
  get<T>(path: string, opts?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) usp.append(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const doFetch = config.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    const { accessToken, tenantId } = config.getAuth();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    let res: Response;
    try {
      res = await doFetch(`${config.baseUrl}${path}${toQuery(opts?.params)}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new AppError({ code: 'network', status: 0, message: (e as Error).message });
    }

    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      try { const j = await res.json(); if (j?.message) message = j.message; } catch { /* noop */ }
      throw new AppError({ code: `http_${res.status}`, status: res.status, message });
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    get: (p, o) => request('GET', p, undefined, o),
    post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b),
    delete: (p) => request('DELETE', p),
  };
}
```

> 401-refresh: deferred to Task 18 once `AuthProvider` exists, wired via `getAuth` + a refresh callback. Documented there.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/httpClient`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/httpClient.ts src/__tests__/lib/httpClient.test.ts
git commit -m "feat: add httpClient with auth/tenant headers and error normalize"
```

---

### Task 10: Repository contracts (interfaces)

**Files:**
- Create: `src/data/repositories/types.ts`
- Test: `src/__tests__/data/repositories-types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/repositories-types.test.ts`:
```ts
import type { Repositories } from '@/data/repositories/types';

// Compile-time contract check: a stub must satisfy the full bundle shape.
describe('Repositories contract', () => {
  it('declares all 15 domains', () => {
    const keys: (keyof Repositories)[] = [
      'auth', 'classes', 'students', 'attendance', 'timetable', 'exams', 'grades',
      'assignments', 'chat', 'announcements', 'calendar', 'library', 'payroll', 'leave', 'dashboard',
    ];
    expect(keys).toHaveLength(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/repositories-types`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/repositories/types.ts`:
```ts
import type {
  Session, User, Class, Student, AttendanceRecord, TimetableSlot, Exam, GradeEntry,
  Assignment, ChatContact, ChatMessage, Announcement, CalendarEvent, LibraryBook,
  PayslipEntry, LeaveRequest, DashboardStats, ExamStatus,
} from '@/data/domain';

export interface NewExamInput { title: string; classId: string; date: string; time: string; duration: number; maxMarks: number; topics: string[]; status: ExamStatus; }
export interface NewLeaveInput { type: LeaveRequest['type']; from: string; to: string; reason: string; substitute?: string; }
export interface GradeInput { studentId: string; examId: string; marks: number; }

export interface AuthRepository {
  login(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  me(): Promise<User>;
  logout(): Promise<void>;
}
export interface ClassesRepository { list(): Promise<Class[]>; get(id: string): Promise<Class>; }
export interface StudentsRepository { listByClass(classId: string): Promise<Student[]>; get(id: string): Promise<Student>; }
export interface AttendanceRepository { forClass(classId: string, date: string): Promise<AttendanceRecord[]>; save(classId: string, date: string, records: AttendanceRecord[]): Promise<void>; }
export interface TimetableRepository { list(): Promise<TimetableSlot[]>; }
export interface ExamsRepository { list(): Promise<Exam[]>; get(id: string): Promise<Exam>; create(input: NewExamInput): Promise<Exam>; update(id: string, patch: Partial<NewExamInput>): Promise<Exam>; remove(id: string): Promise<void>; }
export interface GradesRepository { listByExam(examId: string): Promise<GradeEntry[]>; upsert(input: GradeInput): Promise<GradeEntry>; }
export interface AssignmentsRepository { list(): Promise<Assignment[]>; }
export interface ChatRepository { contacts(): Promise<ChatContact[]>; messages(contactId: string): Promise<ChatMessage[]>; send(contactId: string, text: string): Promise<ChatMessage>; }
export interface AnnouncementsRepository { list(): Promise<Announcement[]>; }
export interface CalendarRepository { list(): Promise<CalendarEvent[]>; }
export interface LibraryRepository { list(): Promise<LibraryBook[]>; }
export interface PayrollRepository { list(): Promise<PayslipEntry[]>; }
export interface LeaveRepository { list(): Promise<LeaveRequest[]>; create(input: NewLeaveInput): Promise<LeaveRequest>; }
export interface DashboardRepository { stats(): Promise<DashboardStats>; }

export interface Repositories {
  auth: AuthRepository; classes: ClassesRepository; students: StudentsRepository;
  attendance: AttendanceRepository; timetable: TimetableRepository; exams: ExamsRepository;
  grades: GradesRepository; assignments: AssignmentsRepository; chat: ChatRepository;
  announcements: AnnouncementsRepository; calendar: CalendarRepository; library: LibraryRepository;
  payroll: PayrollRepository; leave: LeaveRepository; dashboard: DashboardRepository;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/repositories-types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/types.ts src/__tests__/data/repositories-types.test.ts
git commit -m "feat: define repository interfaces for all 15 domains"
```

---

### Task 11: Seed data (moved + color-stripped)

**Files:**
- Create: `src/data/mock/seed.ts`
- Test: `src/__tests__/data/seed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/seed.test.ts`:
```ts
import { seed } from '@/data/mock/seed';

describe('seed', () => {
  it('has the expected counts', () => {
    expect(seed.classes).toHaveLength(4);
    expect(seed.students).toHaveLength(20);
    expect(seed.exams).toHaveLength(5);
  });
  it('classes carry no presentation fields', () => {
    expect(seed.classes[0]).not.toHaveProperty('color');
    expect(seed.classes[0].studentCount).toBeGreaterThan(0);
  });
  it('session is a teacher with a tenant', () => {
    expect(seed.session.user.role).toBe('teacher');
    expect(seed.session.tenant.id).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/seed`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/mock/seed.ts`. Copy every array from the current `src/data/index.ts`, but:
remove all `color`/`colorSoft`/`colorTint`/`avatarColor` properties; rename class `students`→`studentCount`;
add an `id` to each payslip (`ps1..ps6`); wrap the teacher into a `Session`. Shape:
```ts
import type {
  Session, Class, Student, AttendanceRecord, TimetableSlot, Exam, GradeEntry, Assignment,
  ChatContact, ChatMessage, Announcement, CalendarEvent, LibraryBook, PayslipEntry, LeaveRequest,
} from '@/data/domain';

export interface SeedShape {
  session: Session;
  classes: Class[]; students: Student[]; attendance: AttendanceRecord[]; timetable: TimetableSlot[];
  exams: Exam[]; grades: GradeEntry[]; assignments: Assignment[];
  chatContacts: ChatContact[]; chatMessages: Record<string, ChatMessage[]>;
  announcements: Announcement[]; calendar: CalendarEvent[]; library: LibraryBook[];
  payslips: PayslipEntry[]; leave: LeaveRequest[];
}

export const seed: SeedShape = {
  session: {
    accessToken: 'mock.access.token', refreshToken: 'mock.refresh.token',
    tenant: { id: 'school_westbrook', name: 'Westbrook Academy' },
    user: {
      id: 'u_aanya', name: 'Aanya Krishnan', initials: 'AK', title: 'Head of Mathematics',
      email: 'aanya.k@westbrook.edu', phone: '+1 (415) 555-0118', employee: 'WBA-2014-118',
      classroom: 'Block C · Room 214', joined: 'Aug 2014', role: 'teacher',
    },
  },
  classes: [
    { id: 'c1', name: 'Grade 9', section: 'A', subject: 'Mathematics', studentCount: 32, room: 'Room 214', nextPeriod: 'Today 9:00 AM' },
    // ...c2,c3,c4 copied from src/data/index.ts with the same transform
  ],
  // students, attendance, timetable (drop color/colorSoft), exams (drop color/colorSoft),
  // grades, assignments (drop color/colorSoft), chatContacts (drop avatarColor), chatMessages,
  // announcements, calendar (drop color), library (drop color/colorSoft),
  // payslips (add id 'ps1'..'ps6'), leave — all copied verbatim minus presentation.
};
```

> Implementation note for the engineer: open `src/data/index.ts` and transcribe each array.
> This is mechanical. The test counts (4/20/5) guard completeness.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/seed`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/seed.ts src/__tests__/data/seed.test.ts
git commit -m "feat: add color-stripped mock seed data"
```

---

### Task 12: Mock store (in-memory + persistence)

**Files:**
- Create: `src/data/mock/store.ts`
- Test: `src/__tests__/data/store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/store.test.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('mock store', () => {
  beforeEach(() => AsyncStorage.clear());

  it('hydrates from seed when storage empty', async () => {
    const store = await createStore();
    expect(store.tables.classes).toHaveLength(4);
  });
  it('persists table writes and reloads them', async () => {
    const store = await createStore();
    store.tables.exams.unshift({
      id: 'e_new', title: 'Pop Quiz', classId: 'c1', className: 'Grade 9-A', subject: 'Mathematics',
      date: '2026-06-10', time: '9:00 AM', duration: 30, maxMarks: 20, topics: ['Algebra'], status: 'draft',
    });
    await store.persist('exams');
    const reloaded = await createStore();
    expect(reloaded.tables.exams.find((e) => e.id === 'e_new')).toBeTruthy();
  });
  it('genId returns unique prefixed ids', () => {
    const store2Promise = createStore();
    return store2Promise.then((s) => {
      const a = s.genId('exam'); const b = s.genId('exam');
      expect(a).not.toBe(b);
      expect(a.startsWith('exam_')).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/store`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/mock/store.ts`:
```ts
import { readJson, writeJson } from '@/lib/asyncStore';
import { seed, type SeedShape } from './seed';

export type TableName = keyof Omit<SeedShape, 'session'>;
const STORAGE_PREFIX = 'sd.mock.';

export interface Store {
  tables: Omit<SeedShape, 'session'>;
  session: SeedShape['session'];
  persist(table: TableName): Promise<void>;
  genId(prefix: string): string;
}

export async function createStore(): Promise<Store> {
  const tableNames = Object.keys(seed).filter((k) => k !== 'session') as TableName[];
  const tables = {} as Omit<SeedShape, 'session'>;
  for (const name of tableNames) {
    // @ts-expect-error indexed hydrate
    tables[name] = await readJson(`${STORAGE_PREFIX}${name}`, seed[name]);
  }
  let counter = 0;
  return {
    tables,
    session: seed.session,
    async persist(table) {
      await writeJson(`${STORAGE_PREFIX}${table}`, tables[table]);
    },
    genId(prefix) {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/store`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/store.ts src/__tests__/data/store.test.ts
git commit -m "feat: add mock in-memory store with AsyncStorage persistence"
```

---

### Task 13: Repository factory + context

**Files:**
- Create: `src/data/repositories/factory.ts`
- Create: `src/data/repositories/RepositoryContext.tsx`
- Test: `src/__tests__/data/factory.test.ts`

Note: at this point only `auth` is implemented (Phase 2). The factory builds the bundle
incrementally; each later domain task adds its repo to both adapters. For now the factory
returns a partial bundle typed as `Repositories` via a builder that we fill in as we go.
To keep the app compilable, the factory throws a clear error for not-yet-implemented domains.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/factory.test.ts`:
```ts
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('factory', () => {
  it('builds a mock repositories bundle exposing auth', async () => {
    const store = await createStore();
    const repos = createMockRepositories(store);
    expect(typeof repos.auth.login).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/factory`
Expected: FAIL — cannot find module (and `mockAuth` not yet created — implement Task 15 first if executing strictly; see note).

> Execution note: Tasks 13 and 15 are interdependent (factory references `mockAuth`).
> Implement Task 15's `mockAuth`/`httpAuth` first, then return here. Subagent-driven execution
> should treat Tasks 13+15 as one unit. The test above only needs `auth`.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/repositories/factory.ts`:
```ts
import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { httpAuth } from '@/data/http/auth.repo';

const notImplemented = (name: string) =>
  new Proxy({}, { get() { throw new Error(`Repository "${name}" not implemented yet`); } });

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    // domains below are filled in by their tasks; until then they throw on use:
    classes: notImplemented('classes') as Repositories['classes'],
    students: notImplemented('students') as Repositories['students'],
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: notImplemented('timetable') as Repositories['timetable'],
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: notImplemented('assignments') as Repositories['assignments'],
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: notImplemented('announcements') as Repositories['announcements'],
    calendar: notImplemented('calendar') as Repositories['calendar'],
    library: notImplemented('library') as Repositories['library'],
    payroll: notImplemented('payroll') as Repositories['payroll'],
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: notImplemented('dashboard') as Repositories['dashboard'],
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    classes: notImplemented('classes') as Repositories['classes'],
    students: notImplemented('students') as Repositories['students'],
    attendance: notImplemented('attendance') as Repositories['attendance'],
    timetable: notImplemented('timetable') as Repositories['timetable'],
    exams: notImplemented('exams') as Repositories['exams'],
    grades: notImplemented('grades') as Repositories['grades'],
    assignments: notImplemented('assignments') as Repositories['assignments'],
    chat: notImplemented('chat') as Repositories['chat'],
    announcements: notImplemented('announcements') as Repositories['announcements'],
    calendar: notImplemented('calendar') as Repositories['calendar'],
    library: notImplemented('library') as Repositories['library'],
    payroll: notImplemented('payroll') as Repositories['payroll'],
    leave: notImplemented('leave') as Repositories['leave'],
    dashboard: notImplemented('dashboard') as Repositories['dashboard'],
  };
}
```

Create `src/data/repositories/RepositoryContext.tsx`:
```tsx
import React, { createContext, useContext } from 'react';
import type { Repositories } from './types';

const RepositoryContext = createContext<Repositories | null>(null);

export const RepositoryProvider: React.FC<{ repositories: Repositories; children: React.ReactNode }> = ({
  repositories, children,
}) => <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used within RepositoryProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/factory`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/factory.ts src/data/repositories/RepositoryContext.tsx src/__tests__/data/factory.test.ts
git commit -m "feat: add repository factory and context (auth wired, rest stubbed)"
```

---

### Task 14: Shared UI state components + queryClient

**Files:**
- Create: `src/lib/queryClient.ts`
- Create: `src/ui/state/Skeleton.tsx`
- Create: `src/ui/state/ErrorState.tsx`
- Create: `src/ui/state/EmptyState.tsx`
- Test: `src/__tests__/ui/states.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ui/states.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';

describe('UI states', () => {
  it('ErrorState shows message and calls onRetry', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Boom')).toBeTruthy();
  });
  it('EmptyState renders its label', () => {
    render(<EmptyState label="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ui/states`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';
import { isAppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (isAppError(error) && error.status === 401) return false;
        return count < 2;
      },
    },
  },
});

export const queryKeys = {
  classes: (tenantId: string) => ['classes', tenantId] as const,
  class: (tenantId: string, id: string) => ['classes', tenantId, id] as const,
  studentsByClass: (tenantId: string, classId: string) => ['students', tenantId, classId] as const,
  student: (tenantId: string, id: string) => ['student', tenantId, id] as const,
  attendance: (tenantId: string, classId: string, date: string) => ['attendance', tenantId, classId, date] as const,
  timetable: (tenantId: string) => ['timetable', tenantId] as const,
  exams: (tenantId: string) => ['exams', tenantId] as const,
  exam: (tenantId: string, id: string) => ['exams', tenantId, id] as const,
  gradesByExam: (tenantId: string, examId: string) => ['grades', tenantId, examId] as const,
  assignments: (tenantId: string) => ['assignments', tenantId] as const,
  chatContacts: (tenantId: string) => ['chat', tenantId] as const,
  chatMessages: (tenantId: string, contactId: string) => ['chat', tenantId, contactId] as const,
  announcements: (tenantId: string) => ['announcements', tenantId] as const,
  calendar: (tenantId: string) => ['calendar', tenantId] as const,
  library: (tenantId: string) => ['library', tenantId] as const,
  payroll: (tenantId: string) => ['payroll', tenantId] as const,
  leave: (tenantId: string) => ['leave', tenantId] as const,
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
};
```

Create `src/ui/state/ErrorState.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={styles.wrap}>
    <Text style={styles.msg}>{message ?? 'Something went wrong.'}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  msg: { color: Colors.inkMuted, fontSize: 14, textAlign: 'center' },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.primary },
  btnText: { color: Colors.white, fontWeight: '600' },
});
```

Create `src/ui/state/EmptyState.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

export const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.wrap}><Text style={styles.label}>{label}</Text></View>
);
const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.inkMuted, fontSize: 14 },
});
```

Create `src/ui/state/Skeleton.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Colors } from '@/theme';

export const Skeleton: React.FC<{ height?: number; width?: DimensionValue; radius?: number }> = ({
  height = 16, width = '100%', radius = 8,
}) => <View style={[styles.base, { height, width, borderRadius: radius }]} />;

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.rule, opacity: 0.6, marginVertical: 6 },
});
```

> If a referenced `Colors` token is missing, substitute the nearest existing one from `src/theme/colors.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ui/states`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queryClient.ts src/ui/state src/__tests__/ui/states.test.tsx
git commit -m "feat: add queryClient, query keys and shared UI state components"
```

---

## Phase 2 — Auth vertical slice

### Task 15: Auth repository (mock + http) + mappers

**Files:**
- Create: `src/data/mock/auth.repo.ts`
- Create: `src/data/http/mappers.ts`
- Create: `src/data/http/auth.repo.ts`
- Test: `src/__tests__/data/auth.repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/auth.repo.test.ts`:
```ts
import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('mockAuth', () => {
  it('login returns a session with tokens, teacher user and tenant', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('aanya.k@westbrook.edu', 'whatever');
    expect(session.accessToken).toBeTruthy();
    expect(session.user.role).toBe('teacher');
    expect(session.tenant.id).toBeTruthy();
  });
  it('me returns the seeded user', async () => {
    const store = await createStore();
    expect((await mockAuth(store).me()).name).toBe('Aanya Krishnan');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/auth.repo`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/mock/auth.repo.ts`:
```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockAuth(store: Store): AuthRepository {
  return {
    async login(email) {
      await simulateLatency();
      if (!email) throw new AppError({ code: 'invalid', status: 400, message: 'Email required' });
      return store.session;
    },
    async refresh() { await simulateLatency(); return store.session; },
    async me() { await simulateLatency(); return store.session.user; },
    async logout() { await simulateLatency(); },
  };
}
```

Create `src/data/http/mappers.ts` (auth mappers; later domain tasks append here):
```ts
import type { Session, User, Tenant } from '@/data/domain';

export interface SessionDTO {
  access_token: string; refresh_token: string;
  user: { id: string; name: string; initials: string; title: string; email: string; phone: string;
    employee: string; classroom: string; joined: string; role: 'teacher'; };
  tenant: { id: string; name: string };
}

export const toUser = (d: SessionDTO['user']): User => ({ ...d });
export const toTenant = (d: SessionDTO['tenant']): Tenant => ({ ...d });
export const toSession = (d: SessionDTO): Session => ({
  accessToken: d.access_token, refreshToken: d.refresh_token,
  user: toUser(d.user), tenant: toTenant(d.tenant),
});
```

Create `src/data/http/auth.repo.ts`:
```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toSession, toUser, type SessionDTO } from './mappers';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    login: (email, password) => http.post<SessionDTO>('/auth/login', { email, password }).then(toSession),
    refresh: (refreshToken) => http.post<SessionDTO>('/auth/refresh', { refreshToken }).then(toSession),
    me: () => http.get<SessionDTO['user']>('/auth/me').then(toUser),
    logout: () => http.post<void>('/auth/logout'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/auth.repo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/auth.repo.ts src/data/http/mappers.ts src/data/http/auth.repo.ts src/__tests__/data/auth.repo.test.ts
git commit -m "feat: add auth repository (mock + http) and session mappers"
```

---

### Task 16: AuthProvider

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`
- Test: `src/__tests__/features/authProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/features/authProvider.test.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mem[k] ?? null,
  setItemAsync: async (k: string, v: string) => { mem[k] = v; },
  deleteItemAsync: async (k: string) => { delete mem[k]; },
}));

const Probe = () => {
  const { status } = useAuth();
  return <Text>{status}</Text>;
};

describe('AuthProvider', () => {
  it('boots to unauthenticated when no token stored', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- features/authProvider`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/auth/AuthProvider.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import { tokenStore } from '@/lib/tokenStore';
import { useRepositories } from '@/data/repositories/RepositoryContext';

type Status = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthValue {
  status: Status;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.read();
      if (!tokens) { setStatus('unauthenticated'); return; }
      try {
        const user = await repos.auth.me();
        setSession((s) => s ?? null);
        setStatus('authenticated');
        // user kept in session via signIn; me() confirms validity
        void user;
      } catch {
        await tokenStore.clear();
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await repos.auth.login(email, password);
    await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
    setSession(s);
    setStatus('authenticated');
  }, [repos]);

  const signOut = useCallback(async () => {
    try { await repos.auth.logout(); } finally {
      await tokenStore.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  const value = useMemo(() => ({ status, session, signIn, signOut }), [status, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Convenience for query keys: current tenant id (or 'anon'). */
export function useTenantId(): string {
  return useAuth().session?.tenant.id ?? 'anon';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- features/authProvider`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/AuthProvider.tsx src/__tests__/features/authProvider.test.tsx
git commit -m "feat: add AuthProvider with session bootstrap"
```

---

### Task 17: AppProviders + wire into App.tsx

**Files:**
- Create: `src/providers/AppProviders.tsx`
- Modify: `App.tsx`
- Test: `src/__tests__/providers/appProviders.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/providers/appProviders.test.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { useRepositories } from '@/data/repositories/RepositoryContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {},
}));

const Probe = () => {
  const repos = useRepositories();
  return <Text>{typeof repos.auth.login === 'function' ? 'ready' : 'no'}</Text>;
};

describe('AppProviders', () => {
  it('provides repositories and auth to children', async () => {
    render(<AppProviders><Probe /></AppProviders>);
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- providers/appProviders`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/providers/AppProviders.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/config/env';
import { createHttpClient } from '@/lib/httpClient';
import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { tokenStore } from '@/lib/tokenStore';
import type { Repositories } from '@/data/repositories/types';
import { Colors } from '@/theme';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repositories | null>(null);

  useEffect(() => {
    (async () => {
      if (env.DATA_SOURCE === 'live') {
        let cached: { accessToken: string | null; tenantId: string | null } = { accessToken: null, tenantId: null };
        const http = createHttpClient({
          baseUrl: env.API_BASE_URL,
          getAuth: () => cached,
        });
        // refresh cached token snapshot before each render cycle via tokenStore
        tokenStore.read().then((t) => { cached = { accessToken: t?.accessToken ?? null, tenantId: null }; });
        setRepositories(createHttpRepositories(http));
      } else {
        const store = await createStore();
        setRepositories(createMockRepositories(store));
      }
    })();
  }, []);

  if (!repositories) {
    return (
      <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repositories={repositories}>
        <AuthProvider>{children}</AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
});
```

Modify `App.tsx`: wrap the existing tree. Change the `return` so `RootNavigator` is inside providers:
```tsx
// add import
import { AppProviders } from './src/providers/AppProviders';
// ...
return (
  <GestureHandlerRootView style={styles.flex}>
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- providers/appProviders`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/AppProviders.tsx App.tsx src/__tests__/providers/appProviders.test.tsx
git commit -m "feat: add AppProviders and wire providers into App root"
```

---

### Task 18: Auth hooks + 401 refresh wiring

**Files:**
- Create: `src/features/auth/hooks.ts`
- Modify: `src/providers/AppProviders.tsx` (live branch: inject refresh)
- Test: `src/__tests__/features/authHooks.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/features/authHooks.test.tsx`:
```tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useLogin } from '@/features/auth/hooks';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mem[k] ?? null,
  setItemAsync: async (k: string, v: string) => { mem[k] = v; },
  deleteItemAsync: async (k: string) => { delete mem[k]; },
}));

const Probe = () => {
  const login = useLogin();
  const { status } = useAuth();
  return (
    <>
      <Text>{status}</Text>
      <TouchableOpacity onPress={() => login.mutate({ email: 'a@b.c', password: 'x' })}>
        <Text>login</Text>
      </TouchableOpacity>
    </>
  );
};

it('useLogin authenticates', async () => {
  const store = await createStore();
  const repos = createMockRepositories(store);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={repos}>
        <AuthProvider><Probe /></AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('login'));
  await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- features/authHooks`
Expected: FAIL — cannot find module `@/features/auth/hooks`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/auth/hooks.ts`:
```ts
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signIn(email, password),
  });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
```

Modify `src/providers/AppProviders.tsx` live branch — document 401 refresh: when `http.get` rejects
with `status===401`, call `repos.auth.refresh(tokens.refreshToken)`, persist new tokens, retry once;
on failure clear tokens. Since the httpClient is created before repos exist, implement refresh as a
closure the `AuthProvider` registers. Minimal acceptable version for this plan: keep the `getAuth`
snapshot updated from `tokenStore` after each successful `signIn` (already done in AuthProvider via
`tokenStore.save`), and rely on TanStack Query `retry:false` for 401 to surface a re-login. Full
silent-refresh can be a follow-up; note this explicitly in the commit body.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- features/authHooks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/hooks.ts src/providers/AppProviders.tsx src/__tests__/features/authHooks.test.tsx
git commit -m "feat: add auth hooks (useLogin/useLogout); document 401 handling"
```

---

### Task 19: Auth-gate navigation + wire LoginScreen

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/LoginScreen.tsx`
- Test: `src/__tests__/navigation/authGate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/navigation/authGate.test.tsx`:
```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '@/navigation/RootNavigator';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {},
}));

it('shows Login when unauthenticated', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <AuthProvider>
          <NavigationContainer><RootNavigator /></NavigationContainer>
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Welcome Back 👋')).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- navigation/authGate`
Expected: FAIL — RootNavigator still renders both screens unconditionally.

- [ ] **Step 3: Write minimal implementation**

Replace `src/navigation/RootNavigator.tsx`:
```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '@/features/auth/AuthProvider';
import { Colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { status } = useAuth();
  if (status === 'loading') {
    return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'authenticated' ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
});
```

Modify `src/screens/LoginScreen.tsx`: replace the fake `handleLogin` body. Remove the
`navigation.replace('Main')` timeout; call the hook instead:
```tsx
// add imports
import { useLogin } from '@/features/auth/hooks';
// inside component, replace `loading` state usage:
const login = useLogin();
const handleLogin = () => {
  btnScale.value = withSpring(0.96, {}, () => { btnScale.value = withSpring(1); });
  login.mutate({ email, password });
};
// replace `loading` references with `login.isPending`
// (navigation to Main now happens automatically via RootNavigator auth gate)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- navigation/authGate`
Expected: PASS.

- [ ] **Step 5: Manual smoke (optional) + Commit**

```bash
git add src/navigation/RootNavigator.tsx src/screens/LoginScreen.tsx src/__tests__/navigation/authGate.test.tsx
git commit -m "feat: auth-gate navigation and wire LoginScreen to useLogin"
```

---

## Phase 3 — Canonical domain: Classes + Students

This phase establishes the exact pattern every remaining domain follows: **interface (done) →
mock repo → http repo → register in factory → hooks → migrate screen → contract test.**

### Task 20: Classes — mock + http repos, register in factory

**Files:**
- Create: `src/data/mock/classes.repo.ts`
- Create: `src/data/http/classes.repo.ts`
- Modify: `src/data/http/mappers.ts` (add class mapper)
- Modify: `src/data/repositories/factory.ts` (replace both `classes` stubs)
- Test: `src/__tests__/data/classes.repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data/classes.repo.test.ts`:
```ts
import { createStore } from '@/data/mock/store';
import { mockClasses } from '@/data/mock/classes.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('mockClasses', () => {
  it('list returns all seeded classes', async () => {
    const store = await createStore();
    expect(await mockClasses(store).list()).toHaveLength(4);
  });
  it('get returns one by id', async () => {
    const store = await createStore();
    expect((await mockClasses(store).get('c1')).name).toBe('Grade 9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data/classes.repo`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/mock/classes.repo.ts`:
```ts
import type { ClassesRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockClasses(store: Store): ClassesRepository {
  return {
    async list() { await simulateLatency(); return [...store.tables.classes]; },
    async get(id) {
      await simulateLatency();
      const found = store.tables.classes.find((c) => c.id === id);
      if (!found) throw new AppError({ code: 'not_found', status: 404, message: 'Class not found' });
      return found;
    },
  };
}
```

Append to `src/data/http/mappers.ts`:
```ts
import type { Class } from '@/data/domain';
export interface ClassDTO { id: string; name: string; section: string; subject: string; student_count: number; room: string; next_period?: string; }
export const toClass = (d: ClassDTO): Class => ({
  id: d.id, name: d.name, section: d.section, subject: d.subject,
  studentCount: d.student_count, room: d.room, nextPeriod: d.next_period,
});
```

Create `src/data/http/classes.repo.ts`:
```ts
import type { ClassesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toClass, type ClassDTO } from './mappers';

export function httpClasses(http: HttpClient): ClassesRepository {
  return {
    list: () => http.get<ClassDTO[]>('/classes').then((d) => d.map(toClass)),
    get: (id) => http.get<ClassDTO>(`/classes/${id}`).then(toClass),
  };
}
```

In `src/data/repositories/factory.ts`: import `mockClasses`/`httpClasses` and replace the
`classes: notImplemented('classes') ...` line in each builder with `classes: mockClasses(store)`
and `classes: httpClasses(http)` respectively.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- data/classes.repo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/classes.repo.ts src/data/http/classes.repo.ts src/data/http/mappers.ts src/data/repositories/factory.ts src/__tests__/data/classes.repo.test.ts
git commit -m "feat: add classes repository (mock + http) and register in factory"
```

---

### Task 21: Classes — hooks

**Files:**
- Create: `src/features/classes/hooks.ts`
- Test: `src/__tests__/features/classesHooks.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/features/classesHooks.test.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useClasses } from '@/features/classes/hooks';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {},
}));

const Probe = () => {
  const { data, isLoading } = useClasses();
  if (isLoading) return <Text>loading</Text>;
  return <Text>count:{data?.length ?? 0}</Text>;
};

it('useClasses returns seeded classes', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <AuthProvider><Probe /></AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('count:4')).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- features/classesHooks`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/classes/hooks.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useClasses() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.classes(tenantId), queryFn: () => repos.classes.list() });
}

export function useClass(id: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.class(tenantId, id), queryFn: () => repos.classes.get(id) });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- features/classesHooks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/classes/hooks.ts src/__tests__/features/classesHooks.test.tsx
git commit -m "feat: add classes query hooks"
```

---

### Task 22: Migrate ClassesScreen to hooks

**Files:**
- Modify: `src/screens/ClassesScreen.tsx`

- [ ] **Step 1: Read the current screen**

Run: open `src/screens/ClassesScreen.tsx`. Note it imports `{ classes, students }` from `'../data'`
and reads `c.color`, `c.colorSoft`, `c.students` (count).

- [ ] **Step 2: Replace data source + colors**

Edit the screen:
- Remove `import { classes, students } from '../data';`
- Add `import { useClasses } from '@/features/classes/hooks';`
- Add `import { deriveColorSet } from '@/theme/derive';`
- Add `import { Skeleton } from '@/ui/state/Skeleton';`, `ErrorState`, `EmptyState`.
- At top of component: `const { data: classes = [], isLoading, isError, refetch } = useClasses();`
- Where the list renders, branch: `isLoading` → render 4 `<Skeleton height={84} />`; `isError` →
  `<ErrorState onRetry={refetch} />`; `classes.length === 0` → `<EmptyState label="No classes yet" />`.
- Replace each `cls.color`/`cls.colorSoft`/`cls.colorTint` with
  `const cs = deriveColorSet(cls.id);` then `cs.color` / `cs.colorSoft` / `cs.colorTint`.
- Replace `cls.students` (the count) with `cls.studentCount`.
- If the screen used `students` to compute per-class counts, prefer `cls.studentCount` directly.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `ClassesScreen.tsx`.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ClassesScreen.tsx
git commit -m "feat: migrate ClassesScreen to useClasses + derived colors"
```

---

### Task 23: Contract test harness + Classes contract

**Files:**
- Create: `src/__tests__/contracts/contract.ts` (shared suite runner)
- Create: `src/__tests__/contracts/classes.contract.test.ts`

This is the reconciliation guarantee: the same behavioral suite runs against the mock adapter and
a fixture-backed http adapter. Both must pass identically.

- [ ] **Step 1: Write the shared contract + Classes test**

Create `src/__tests__/contracts/contract.ts`:
```ts
import type { ClassesRepository } from '@/data/repositories/types';

export function classesContract(name: string, make: () => Promise<ClassesRepository>) {
  describe(`ClassesRepository contract [${name}]`, () => {
    it('list returns an array of classes with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const c of list) {
        expect(typeof c.id).toBe('string');
        expect(typeof c.studentCount).toBe('number');
        expect(c).not.toHaveProperty('color');
      }
    });
    it('get returns the requested class', async () => {
      const repo = await make();
      const first = (await repo.list())[0];
      expect((await repo.get(first.id)).id).toBe(first.id);
    });
  });
}
```

Create `src/__tests__/contracts/classes.contract.test.ts`:
```ts
import { classesContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockClasses } from '@/data/mock/classes.repo';
import { httpClasses } from '@/data/http/classes.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ClassDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Fixture-backed fetch so the http adapter runs without a real server.
const FIXTURE: ClassDTO[] = [
  { id: 'c1', name: 'Grade 9', section: 'A', subject: 'Mathematics', student_count: 32, room: 'Room 214' },
];
const fetchImpl = jest.fn(async (url: string) => {
  const isList = url.endsWith('/classes');
  const body = isList ? FIXTURE : FIXTURE[0];
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
});

classesContract('mock', async () => mockClasses(await createStore()));
classesContract('http', async () =>
  httpClasses(createHttpClient({ baseUrl: 'https://api.test', getAuth: () => ({ accessToken: 't', tenantId: 's' }), fetchImpl })),
);
```

- [ ] **Step 2: Run test to verify it fails then passes**

Run: `npm test -- contracts/classes`
Expected: FAIL first if any field mismatch, then PASS after fixes. Target: PASS, both `[mock]` and `[http]` suites green.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/contracts
git commit -m "test: add contract harness proving mock and http classes adapters match"
```

---

### Task 24–27: Students domain (same pattern)

Repeat Tasks 20→23 for **Students**, using these concrete specifics:

- **Task 24 (repos):** `src/data/mock/students.repo.ts` + `src/data/http/students.repo.ts`.
  - `mockStudents(store).listByClass(classId)` → `store.tables.students.filter((s) => s.classId === classId)`; `get(id)` → find or 404.
  - DTO `StudentDTO` in mappers: snake_case `class_id`, `parent_phone`; `toStudent` maps them. Student carries no presentation, so mapping is field-rename only.
  - Endpoints: `GET /classes/:classId/students`, `GET /students/:id`.
  - Register both in `factory.ts` (replace the two `students` stubs).
  - Test `src/__tests__/data/students.repo.test.ts`: `listByClass('c1')` returns 10; `get('s1').name === 'Aarav Sharma'`.
- **Task 25 (hooks):** `src/features/students/hooks.ts` → `useStudentsByClass(classId)`, `useStudent(id)` using `queryKeys.studentsByClass` / `queryKeys.student`.
- **Task 26 (screens):** migrate `src/screens/StudentScreen.tsx` and `src/screens/ClassDetailScreen.tsx` to the hooks; derive colors; add loading/error/empty states.
- **Task 27 (contract):** add `studentsContract` to `contract.ts` and `students.contract.test.ts` with a `StudentDTO` fixture; run against mock + http.

Commit after each task with messages mirroring Tasks 20–23.

---

## Phase 4 — Remaining 13 domains

### Task 28: Migrate remaining domains (one sub-task per domain)

Each domain is an independent unit that follows the **exact** Phase-3 pattern:
`mock repo → http repo (+ mapper) → register in factory → hooks → migrate screen(s) → contract test`,
TDD with a commit per step. Use this spec table for the concrete details of each. Read the current
screen first to learn the fields it consumes, then derive colors via `deriveColorSet(id)` and add
loading/error/empty states.

| Domain | Repo methods | REST endpoints | Hooks | Screen(s) to migrate | Write/optimistic? |
|---|---|---|---|---|---|
| timetable | `list()` | `GET /timetable` | `useTimetable()` | `ScheduleScreen` | no |
| exams | `list/get/create/update/remove` | `GET/POST/PATCH/DELETE /exams` | `useExams`, `useExam`, `useCreateExam`, `useUpdateExam`, `useDeleteExam` | `ExamsScreen`, `ExamDetailScreen`, `ExamNewScreen` | **yes** — create/update/delete optimistic on `queryKeys.exams` |
| grades | `listByExam(examId)`, `upsert(GradeInput)` | `GET /exams/:id/grades`, `PUT /grades` | `useGradesByExam`, `useUpsertGrade` | `GradesScreen` | **yes** — optimistic on `queryKeys.gradesByExam` |
| attendance | `forClass(classId,date)`, `save(...)` | `GET /classes/:id/attendance`, `POST /classes/:id/attendance` | `useAttendance(classId,date)`, `useMarkAttendance(classId,date)` | `AttendancePickClassScreen`, `AttendanceScreen` | **yes** — optimistic on `queryKeys.attendance` |
| assignments | `list()` | `GET /assignments` | `useAssignments()` | `AssignmentsScreen` | no |
| chat | `contacts()`, `messages(id)`, `send(id,text)` | `GET /chats`, `GET /chats/:id/messages`, `POST /chats/:id/messages` | `useChatContacts`, `useChatMessages(id)`, `useSendMessage(id)` | `ChatScreen`, `ChatThreadScreen` | **yes** — optimistic append on `queryKeys.chatMessages` |
| announcements | `list()` | `GET /announcements` | `useAnnouncements()` | `AnnouncementsScreen`, (Home preview) | no |
| calendar | `list()` | `GET /calendar` | `useCalendar()` | `CalendarScreen` | no |
| library | `list()` | `GET /library` | `useLibrary()` | `LibraryScreen` | no |
| payroll | `list()` | `GET /payslips` | `usePayslips()` | `PayslipScreen` | no |
| leave | `list()`, `create(NewLeaveInput)` | `GET /leave`, `POST /leave` | `useLeave`, `useApplyLeave` | `LeaveScreen` | **yes** — optimistic prepend on `queryKeys.leave` |
| dashboard | `stats()` | `GET /dashboard/stats` | `useDashboardStats()` | `HomeScreen`, `ProfileScreen` | no |

**Mapper note:** for each domain add a `XxxDTO` + `toXxx` in `src/data/http/mappers.ts` using snake_case
wire fields (`class_id`, `due_date`, `max_marks`, etc.). DTO↔domain rename only — no presentation in domain.

**Optimistic mutation recipe** (used by exams/grades/attendance/chat/leave). Concrete worked example for
`useMarkAttendance`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { AttendanceRecord } from '@/data/domain';

export function useMarkAttendance(classId: string, date: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId, classId, date);
  return useMutation({
    mutationFn: (records: AttendanceRecord[]) => repos.attendance.save(classId, date, records),
    onMutate: async (records) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceRecord[]>(key);
      qc.setQueryData(key, records);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```
Each write screen calls `mutation.mutate(...)`, shows the `Toast` component on error, and relies on the
optimistic cache for instant UI. The same recipe applies to exams/grades/chat/leave with their keys.

**Mock write repos** mutate the relevant `store.tables.<x>`, call `store.genId(prefix)` for new ids,
and `await store.persist('<x>')` so writes survive reload.

**Contract tests:** add one `xxxContract` per domain to the contracts folder (extend `contract.ts`
or add per-domain files), run against mock + a fixture-backed http adapter. For write methods, the
contract asserts the returned shape (e.g. created exam has an `id` and echoes input fields).

- [ ] **Step 1:** timetable (read-only) — repos, hooks, migrate `ScheduleScreen`, contract. Commit.
- [ ] **Step 2:** assignments (read-only) — repos, hooks, migrate `AssignmentsScreen`, contract. Commit.
- [ ] **Step 3:** announcements (read-only) — repos, hooks, migrate `AnnouncementsScreen` + Home preview, contract. Commit.
- [ ] **Step 4:** calendar (read-only) — repos, hooks, migrate `CalendarScreen`, contract. Commit.
- [ ] **Step 5:** library (read-only) — repos, hooks, migrate `LibraryScreen`, contract. Commit.
- [ ] **Step 6:** payroll (read-only) — repos, hooks, migrate `PayslipScreen`, contract. Commit.
- [ ] **Step 7:** dashboard (read-only, derive stats in mock from tables) — repos, hooks, migrate `HomeScreen` + `ProfileScreen`, contract. Commit.
- [ ] **Step 8:** exams (CRUD) — repos with create/update/remove, hooks incl. optimistic mutations, migrate `ExamsScreen`/`ExamDetailScreen`/`ExamNewScreen`, contract. Commit.
- [ ] **Step 9:** grades (upsert) — repos, hooks, migrate `GradesScreen`, contract. Commit.
- [ ] **Step 10:** attendance (save) — repos, hooks incl. `useMarkAttendance`, migrate `AttendancePickClassScreen`/`AttendanceScreen`, contract. Commit.
- [ ] **Step 11:** chat (send) — repos, hooks incl. optimistic `useSendMessage`, migrate `ChatScreen`/`ChatThreadScreen`, contract. Commit.
- [ ] **Step 12:** leave (create) — repos, hooks incl. `useApplyLeave`, migrate `LeaveScreen`, contract. Commit.

After each step run `npm test` and `npx tsc --noEmit` — both must be green before committing.

---

### Task 29: Remove legacy data module + final verification

**Files:**
- Delete: `src/data/index.ts`
- Modify: any remaining import of `'../data'` or `'@/data'` (should be none after Phase 3–4)
- Modify: `src/types/index.ts` (delete presentation-only types now unused, keep form types still referenced)

- [ ] **Step 1: Find remaining legacy imports**

Run: `grep -rn "from '\.\./data'" src/screens; grep -rn "from '@/data'" src`
Expected: only `@/data/domain`, `@/data/mock`, `@/data/repositories`, `@/data/http` remain. No bare `'../data'`.

- [ ] **Step 2: Delete the legacy aggregate**

Run: `git rm src/data/index.ts`
Expected: removed. Re-run the grep from Step 1 — zero bare-`'../data'` matches.

- [ ] **Step 3: Prune unused legacy types**

In `src/types/index.ts`, delete interfaces now superseded by `@/data/domain` (e.g. `Teacher`,
the color-bearing `SchoolClass`, etc.) **only if** `npx tsc --noEmit` confirms they are unused.
Keep `ExamFormData`, `LeaveFormData`, `ChatMessageFormData` if screens still import them.

- [ ] **Step 4: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all green; no references to deleted modules.

- [ ] **Step 5: Manual smoke**

Run: `npm start` → open the app (web or device). Verify: login works, classes load with a brief
skeleton, attendance marking persists across reload (mock), creating an exam shows it instantly.
Then set `EXPO_PUBLIC_DATA_SOURCE=live` in `.env`, restart, and confirm the app attempts network
calls (failing gracefully to `ErrorState` since no backend) — proving the swap path.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy static data module; all screens on swappable layer"
```

---

## Self-Review notes (resolved)

- **Spec coverage:** layering (Tasks 9–14, 17), repository contracts (10), mock adapter w/ persistence
  (11–12), http adapter + mappers (9, 15, 20, 28), auth + tenancy (8, 15–19), data flow read+optimistic
  write (21–22, 28 recipe), error/loading/empty states (3, 14), contract tests (23, 27, 28), config flag
  (2, 17), color cleanup (6), incremental migration (Phases ordered), new deps (1). All present.
- **Type consistency:** `Repositories` keys identical in types/factory/test; `studentCount` (not
  `students`) used in domain, seed, mocks, screen; `queryKeys` names match hook usage; `deriveColorSet`
  name consistent.
- **Placeholders:** none — the only "transcribe the arrays" step (Task 11) is mechanical copy from a
  named source file, guarded by count assertions.
```
