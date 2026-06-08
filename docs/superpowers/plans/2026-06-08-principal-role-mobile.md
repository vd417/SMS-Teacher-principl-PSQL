# Principal Role in the Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `principal` role to the teacher-only mobile app — a role-aware experience with an oversight Home, an Approvals inbox (leave + attendance corrections), reused geofence self check-in, and reuse-heavy add-ons (announcements broadcast, live bus, calendar, teacher directory) — all mock-first behind the existing repository interface.

**Architecture:** One app, branched on `session.user.role`. A new `PrincipalTabNavigator` renders for principals; the existing `MainTabNavigator` is untouched for teachers. New data (approvals, principal overview, announcement-create) flows through the `Repositories` interface, implemented in `src/data/mock/*` now and `src/data/http/*` for parity, so a future .NET backend drops in with no screen changes. Login chooses between two seeded demo accounts (teacher + principal); the mock store tracks the current account and persists it across restarts.

**Tech Stack:** Expo / React Native 0.81, React 19, TypeScript, React Navigation 7, TanStack Query 5, Jest + Testing Library. Path alias `@/` → `src/`.

**Spec:** `docs/superpowers/specs/2026-06-08-principal-role-mobile-design.md`

---

## File Structure

**Domain / data layer**

- Modify `src/data/domain/index.ts` — widen `Role`; add `ApprovalRequest`, `ApprovalRequestType`, `PrincipalKpis`, `StaffAttendanceEntry`, `PrincipalOverview`.
- Modify `src/data/mock/seed.ts` — `principalSession` const; `approvals` + `staff` seed tables.
- Modify `src/data/mock/store.ts` — multi-account support (`accounts`, `currentEmail`, `setCurrentAccount`, persisted current account).
- Modify `src/data/mock/auth.repo.ts` — login picks account by email.
- Create `src/data/mock/approvals.repo.ts`, `src/data/mock/principal.repo.ts`.
- Modify `src/data/mock/announcements.repo.ts` — add `create`.
- Create `src/data/http/approvals.repo.ts`, `src/data/http/principal.repo.ts`.
- Modify `src/data/http/announcements.repo.ts` — add `create`.
- Modify `src/data/http/mappers.ts` — DTOs/mappers for approvals, principal overview, announcement-create; widen `SessionDTO.user.role`.
- Modify `src/data/repositories/types.ts` — `ApprovalsRepository`, `PrincipalRepository`, `AnnouncementsRepository.create`, `NewAnnouncementInput`; add to `Repositories`.
- Modify `src/data/repositories/factory.ts` — wire `approvals`, `principal`.
- Modify `src/lib/queryClient.ts` — `approvals`, `principalOverview` query keys.

**Feature hooks**

- Create `src/features/approvals/hooks.ts`, `src/features/principal/hooks.ts`.
- Modify `src/features/announcements/hooks.ts` — `useCreateAnnouncement`.

**Screens / navigation**

- Create `src/screens/principal/PrincipalHomeScreen.tsx`, `ApprovalsScreen.tsx`, `TeacherDirectoryScreen.tsx`.
- Modify `src/screens/AnnouncementsScreen.tsx` — role-gated compose.
- Create `src/navigation/PrincipalTabNavigator.tsx`.
- Modify `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`.

**Tests**

- Modify `src/__tests__/contracts/contract.ts` — `approvalsContract`, `principalContract`, extend `announcementsContract`.
- Create `src/__tests__/contracts/approvals.contract.test.ts`, `principal.contract.test.ts`.
- Modify `src/__tests__/contracts/announcements.contract.test.ts`.
- Modify/create `src/__tests__/data/store.test.ts`, `src/__tests__/data/auth.repo.test.ts`, `src/__tests__/data/seed.test.ts`, `src/__tests__/data/domain.test.ts`.
- Create `src/__tests__/navigation/principalGate.test.tsx` (existing `authGate.test.tsx` unchanged).

---

## Conventions to follow (read before starting)

- Every repo method is `async` and mock methods call `await simulateLatency()` first (`import { simulateLatency } from '@/lib/latency'`).
- Mock writes go through `store.persist(tableName)`; new ids via `store.genId(prefix)`.
- Errors use `AppError` from `@/lib/errors` (`new AppError({ code, status, message })`).
- Hooks use `useRepositories()`, `useTenantId()`, and `queryKeys` exactly like `src/features/leave/hooks.ts`.
- Contract tests register both `mock` and `http` implementations (see `src/__tests__/contracts/leave.contract.test.ts`).
- Commit after each task with the message shown in its final step.

---

## Phase 1 — Role foundation & multi-account auth

### Task 1: Widen `Role` and add the principal demo account

**Files:**

- Modify: `src/data/domain/index.ts:11`
- Modify: `src/data/mock/seed.ts` (add a `principalSession` export)
- Test: `src/__tests__/data/domain.test.ts`, `src/__tests__/data/seed.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/data/seed.test.ts`:

```ts
import { principalSession } from '@/data/mock/seed';

describe('principal demo account', () => {
  it('principalSession is a principal with its own identity', () => {
    expect(principalSession.user.role).toBe('principal');
    expect(principalSession.user.email).toBe('sunita.r@westbrook.edu');
    expect(principalSession.tenant.id).toBe('school_westbrook');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/data/seed.test.ts`
Expected: FAIL — `principalSession` is not exported.

- [ ] **Step 3: Widen the Role type** in `src/data/domain/index.ts` — replace line 11:

```ts
export type Role = 'teacher' | 'principal';
```

- [ ] **Step 4: Add the principal account** to `src/data/mock/seed.ts`. After the `seed` object's closing `};` (end of file), append:

```ts
export const principalSession: Session = {
  accessToken: 'mock.access.principal',
  refreshToken: 'mock.refresh.principal',
  tenant: { id: 'school_westbrook', name: 'Westbrook Academy' },
  user: {
    id: 'u_sunita',
    name: 'Sunita Rao',
    initials: 'SR',
    title: 'Principal',
    email: 'sunita.r@westbrook.edu',
    phone: '+1 (415) 555-0100',
    employee: 'WBA-2009-007',
    classroom: 'Admin Block · Office 1',
    joined: 'Jun 2009',
    role: 'principal',
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/__tests__/data/seed.test.ts src/__tests__/data/domain.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/domain/index.ts src/data/mock/seed.ts src/__tests__/data/seed.test.ts
git commit -m "feat: add principal role and seeded principal demo account"
```

---

### Task 2: Multi-account mock store

The store currently exposes a single static `session`. Make it hold both demo accounts, track the current one by email, and persist that choice so a principal login survives an app restart.

**Files:**

- Modify: `src/data/mock/store.ts`
- Test: `src/__tests__/data/store.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/data/store.test.ts`:

```ts
import { createStore } from '@/data/mock/store';

describe('multi-account store', () => {
  it('defaults to the teacher account', async () => {
    const store = await createStore();
    expect(store.session.user.role).toBe('teacher');
  });

  it('setCurrentAccount switches the active session by email', async () => {
    const store = await createStore();
    await store.setCurrentAccount('sunita.r@westbrook.edu');
    expect(store.session.user.role).toBe('principal');
    expect(store.session.user.email).toBe('sunita.r@westbrook.edu');
  });

  it('unknown email leaves the current account unchanged', async () => {
    const store = await createStore();
    await store.setCurrentAccount('nobody@example.com');
    expect(store.session.user.role).toBe('teacher');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/data/store.test.ts`
Expected: FAIL — `store.setCurrentAccount` is not a function.

- [ ] **Step 3: Implement multi-account support** — replace the entire contents of `src/data/mock/store.ts` with:

```ts
import { readJson, writeJson } from '@/lib/asyncStore';
import { seed, principalSession, type SeedShape } from './seed';

export type TableName = keyof Omit<SeedShape, 'session'>;
const STORAGE_PREFIX = 'sd.mock.';
const CURRENT_ACCOUNT_KEY = `${STORAGE_PREFIX}currentAccount`;

// All demo accounts, keyed by lowercased email.
const ACCOUNTS = [seed.session, principalSession];
const accountByEmail = new Map(ACCOUNTS.map((s) => [s.user.email.toLowerCase(), s]));
const DEFAULT_EMAIL = seed.session.user.email.toLowerCase();

export interface Store {
  tables: Omit<SeedShape, 'session'>;
  session: SeedShape['session'];
  setCurrentAccount(email: string): Promise<void>;
  persist(table: TableName): Promise<void>;
  genId(prefix: string): string;
}

export async function createStore(): Promise<Store> {
  const tableNames = Object.keys(seed).filter((k) => k !== 'session') as TableName[];
  const tables = {} as Omit<SeedShape, 'session'>;
  for (const name of tableNames) {
    // Clone the seed fallback so mock writes never mutate the shared seed constant.
    const fallback = JSON.parse(JSON.stringify(seed[name]));
    tables[name] = await readJson(`${STORAGE_PREFIX}${name}`, fallback);
  }

  let currentEmail = (await readJson<string>(CURRENT_ACCOUNT_KEY, DEFAULT_EMAIL)).toLowerCase();
  if (!accountByEmail.has(currentEmail)) currentEmail = DEFAULT_EMAIL;

  let counter = 0;
  return {
    tables,
    get session() {
      return accountByEmail.get(currentEmail) ?? seed.session;
    },
    async setCurrentAccount(email) {
      const key = email.toLowerCase();
      if (!accountByEmail.has(key)) return;
      currentEmail = key;
      await writeJson(CURRENT_ACCOUNT_KEY, currentEmail);
    },
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/data/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/store.ts src/__tests__/data/store.test.ts
git commit -m "feat: multi-account mock store with persisted current account"
```

---

### Task 3: Mock auth selects account by email (+ widen SessionDTO role)

**Files:**

- Modify: `src/data/mock/auth.repo.ts`
- Modify: `src/data/http/mappers.ts:39` (widen DTO role for http parity)
- Test: `src/__tests__/data/auth.repo.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/data/auth.repo.test.ts`:

```ts
import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';

describe('mock auth account selection', () => {
  it('logging in with the principal email returns the principal session', async () => {
    const repo = mockAuth(await createStore());
    const session = await repo.login('sunita.r@westbrook.edu', 'x');
    expect(session.user.role).toBe('principal');
  });

  it('me() reflects the most recent login', async () => {
    const store = await createStore();
    const repo = mockAuth(store);
    await repo.login('sunita.r@westbrook.edu', 'x');
    expect((await repo.me()).role).toBe('principal');
  });

  it('logging in with the teacher email returns the teacher session', async () => {
    const repo = mockAuth(await createStore());
    const session = await repo.login('aanya.k@westbrook.edu', 'x');
    expect(session.user.role).toBe('teacher');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/data/auth.repo.test.ts`
Expected: FAIL — login still returns the default session.

- [ ] **Step 3: Implement account selection** — replace the `login` method in `src/data/mock/auth.repo.ts` so the whole file reads:

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
      await store.setCurrentAccount(email);
      return store.session;
    },
    async refresh() {
      await simulateLatency();
      return store.session;
    },
    async me() {
      await simulateLatency();
      return store.session.user;
    },
    async logout() {
      await simulateLatency();
    },
  };
}
```

- [ ] **Step 4: Widen the HTTP DTO role** in `src/data/http/mappers.ts` — replace line 39 (`role: 'teacher';`) inside `SessionDTO.user` with:

```ts
    role: import('@/data/domain').Role extends never ? never : 'teacher' | 'principal';
```

If the inline `import(...)` type is awkward in this file, instead add `Role` to the existing type import block at the top (lines 1–24) and use `role: Role;`. Prefer the import-block approach:

```ts
// in the top import block of mappers.ts, add Role:
  LeaveStatus,
  Role,
} from '@/data/domain';
```

then set the DTO field to `role: Role;`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/__tests__/data/auth.repo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/mock/auth.repo.ts src/data/http/mappers.ts src/__tests__/data/auth.repo.test.ts
git commit -m "feat: mock auth selects demo account by email; widen session DTO role"
```

---

### Task 4: Login screen — two one-tap demo accounts

**Files:**

- Modify: `src/screens/LoginScreen.tsx`

- [ ] **Step 1: Add demo-account constants** below the imports in `src/screens/LoginScreen.tsx` (after line 24):

```ts
const DEMO_ACCOUNTS = [
  { label: 'Teacher', email: 'aanya.k@westbrook.edu' },
  { label: 'Principal', email: 'sunita.r@westbrook.edu' },
] as const;
```

- [ ] **Step 2: Render the chips.** Inside the card, immediately after the "Sign In Button" `Animated.View` block (after line 155, before the Biometrics `TouchableOpacity`), insert:

```tsx
{
  /* One-tap demo accounts */
}
<View style={styles.demoRow}>
  {DEMO_ACCOUNTS.map((acc) => (
    <TouchableOpacity
      key={acc.email}
      style={styles.demoChip}
      activeOpacity={0.85}
      disabled={login.isPending}
      onPress={() => {
        setEmail(acc.email);
        setPassword('password123');
        login.mutate({ email: acc.email, password: 'password123' });
      }}
    >
      <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
      <Text style={styles.demoChipText}>{acc.label}</Text>
    </TouchableOpacity>
  ))}
</View>;
```

- [ ] **Step 3: Add styles** to the `StyleSheet.create({...})` in the same file (add these keys):

```ts
  demoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  demoChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
```

- [ ] **Step 4: Verify the app type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat: one-tap teacher/principal demo logins on login screen"
```

---

## Phase 2 — Approvals (data layer)

### Task 5: Approvals domain type, repository interface, seed, query key

**Files:**

- Modify: `src/data/domain/index.ts`
- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/mock/seed.ts`
- Modify: `src/lib/queryClient.ts`
- Test: `src/__tests__/data/seed.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/data/seed.test.ts`:

```ts
import { seed as fullSeed } from '@/data/mock/seed';

describe('approvals seed', () => {
  it('seeds pending leave and attendance_correction requests', () => {
    const pending = fullSeed.approvals.filter((a) => a.status === 'pending');
    expect(pending.length).toBeGreaterThanOrEqual(3);
    expect(fullSeed.approvals.some((a) => a.type === 'leave')).toBe(true);
    expect(fullSeed.approvals.some((a) => a.type === 'attendance_correction')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/data/seed.test.ts`
Expected: FAIL — `fullSeed.approvals` is undefined.

- [ ] **Step 3: Add the domain types** to `src/data/domain/index.ts` (after the `LeaveRequest` interface, around line 165):

```ts
export type ApprovalRequestType = 'leave' | 'attendance_correction';
export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  requesterId: string;
  requesterName: string;
  requesterInitials: string;
  title: string; // e.g. "Casual leave · 2 days"
  detail: string; // human-readable summary
  from?: string; // YYYY-MM-DD (leave range / correction date)
  to?: string; // YYYY-MM-DD
  reason?: string;
  substitute?: string;
  priority: 'high' | 'medium' | 'low';
  status: LeaveStatus; // 'pending' | 'approved' | 'rejected'
  appliedOn: string; // YYYY-MM-DD
  decidedNote?: string;
}
```

- [ ] **Step 4: Add the repository interface** to `src/data/repositories/types.ts`. First add `ApprovalRequest` to the domain import block (lines 1–27), then add this interface near `LeaveRepository` (after line 114):

```ts
export interface ApprovalsRepository {
  list(): Promise<ApprovalRequest[]>;
  decide(id: string, decision: 'approved' | 'rejected', note?: string): Promise<ApprovalRequest>;
}
```

and add to the `Repositories` interface (after `leave: LeaveRepository;`):

```ts
approvals: ApprovalsRepository;
```

- [ ] **Step 5: Add the seed table.** In `src/data/mock/seed.ts`, add `ApprovalRequest` to the domain import block (lines 1–20), add `approvals: ApprovalRequest[];` to `SeedShape` (after `leave: LeaveRequest[];`), and add this array inside the `seed` object (after the `leave: [...]` block, before `buses:`):

```ts
  // ─── Approvals (principal inbox) ─────────────────────────────────────────────
  approvals: [
    {
      id: 'ar1',
      type: 'leave',
      requesterId: 'u_rajesh',
      requesterName: 'Rajesh Kumar',
      requesterInitials: 'RK',
      title: 'Casual leave · 3 days',
      detail: 'Casual leave 12–14 Jun. Substitute arranged.',
      from: '2026-06-12',
      to: '2026-06-14',
      reason: 'Family function out of town.',
      substitute: 'Mr. David Lee',
      priority: 'low',
      status: 'pending',
      appliedOn: '2026-06-06',
    },
    {
      id: 'ar2',
      type: 'leave',
      requesterId: 'u_meera',
      requesterName: 'Meera Krishnan',
      requesterInitials: 'MK',
      title: 'Sick leave · 1 day',
      detail: 'Sick leave 9 Jun. Doctor advised rest.',
      from: '2026-06-09',
      to: '2026-06-09',
      reason: 'Viral fever.',
      priority: 'medium',
      status: 'pending',
      appliedOn: '2026-06-08',
    },
    {
      id: 'ar3',
      type: 'attendance_correction',
      requesterId: 'u_aanya',
      requesterName: 'Aanya Krishnan',
      requesterInitials: 'AK',
      title: 'Attendance correction · Grade 9-A',
      detail: 'Mark 6 students present (late bus) for 3 Jun.',
      from: '2026-06-03',
      reason: 'School bus was delayed; students arrived 20 min late.',
      priority: 'medium',
      status: 'pending',
      appliedOn: '2026-06-04',
    },
    {
      id: 'ar4',
      type: 'attendance_correction',
      requesterId: 'u_vikram',
      requesterName: 'Vikram Desai',
      requesterInitials: 'VD',
      title: 'Attendance correction · Grade 11-A',
      detail: 'Change 1 student from Absent to Leave for 5 Jun.',
      from: '2026-06-05',
      reason: 'Approved medical leave submitted late.',
      priority: 'high',
      status: 'pending',
      appliedOn: '2026-06-06',
    },
  ],
```

- [ ] **Step 6: Add the query key** to `src/lib/queryClient.ts` `queryKeys` (after the `leave:` line):

```ts
  approvals: (tenantId: string) => ['approvals', tenantId] as const,
  principalOverview: (tenantId: string) => ['principal', tenantId, 'overview'] as const,
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/__tests__/data/seed.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data/domain/index.ts src/data/repositories/types.ts src/data/mock/seed.ts src/lib/queryClient.ts src/__tests__/data/seed.test.ts
git commit -m "feat: approvals domain type, repository interface, seed, query keys"
```

---

### Task 6: Mock approvals repository

**Files:**

- Create: `src/data/mock/approvals.repo.ts`
- Test: covered by the contract test in Task 8 (write the implementation here)

- [ ] **Step 1: Create the mock repo** `src/data/mock/approvals.repo.ts`:

```ts
import type { ApprovalsRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockApprovals(store: Store): ApprovalsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.approvals];
    },

    async decide(id, decision, note) {
      await simulateLatency();
      const req = store.tables.approvals.find((a) => a.id === id);
      if (!req)
        throw new AppError({ code: 'not_found', status: 404, message: 'Request not found' });
      req.status = decision;
      if (note !== undefined) req.decidedNote = note;
      await store.persist('approvals');
      return { ...req };
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/mock/approvals.repo.ts
git commit -m "feat: mock approvals repository (list + decide)"
```

---

### Task 7: HTTP approvals repository + mappers

**Files:**

- Modify: `src/data/http/mappers.ts`
- Create: `src/data/http/approvals.repo.ts`

- [ ] **Step 1: Add the DTO + mapper** to the end of `src/data/http/mappers.ts`. First add `ApprovalRequest` and `ApprovalRequestType` to the top import block, then append:

```ts
// ─── Approvals ───────────────────────────────────────────────────────────────
export interface ApprovalRequestDTO {
  id: string;
  type: ApprovalRequestType;
  requester_id: string;
  requester_name: string;
  requester_initials: string;
  title: string;
  detail: string;
  from?: string;
  to?: string;
  reason?: string;
  substitute?: string;
  priority: ApprovalRequest['priority'];
  status: ApprovalRequest['status'];
  applied_on: string;
  decided_note?: string;
}
export const toApprovalRequest = (d: ApprovalRequestDTO): ApprovalRequest => ({
  id: d.id,
  type: d.type,
  requesterId: d.requester_id,
  requesterName: d.requester_name,
  requesterInitials: d.requester_initials,
  title: d.title,
  detail: d.detail,
  from: d.from,
  to: d.to,
  reason: d.reason,
  substitute: d.substitute,
  priority: d.priority,
  status: d.status,
  appliedOn: d.applied_on,
  decidedNote: d.decided_note,
});
```

- [ ] **Step 2: Create the HTTP repo** `src/data/http/approvals.repo.ts`:

```ts
import type { ApprovalsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toApprovalRequest, type ApprovalRequestDTO } from './mappers';

export function httpApprovals(http: HttpClient): ApprovalsRepository {
  return {
    list: () => http.get<ApprovalRequestDTO[]>('/approvals').then((d) => d.map(toApprovalRequest)),

    decide: (id, decision, note) =>
      http
        .patch<ApprovalRequestDTO>(`/approvals/${id}`, { status: decision, decided_note: note })
        .then(toApprovalRequest),
  };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/http/mappers.ts src/data/http/approvals.repo.ts
git commit -m "feat: http approvals repository + DTO mapper"
```

---

### Task 8: Approvals contract test (mock + http)

**Files:**

- Modify: `src/__tests__/contracts/contract.ts`
- Create: `src/__tests__/contracts/approvals.contract.test.ts`

- [ ] **Step 1: Add the contract helper** to `src/__tests__/contracts/contract.ts`. Add `ApprovalsRepository` to the top type-import block, then append:

```ts
export function approvalsContract(name: string, make: () => Promise<ApprovalsRepository>) {
  describe(`ApprovalsRepository contract [${name}]`, () => {
    it('list returns an array of approval requests with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const r of list) {
        expect(typeof r.id).toBe('string');
        expect(typeof r.type).toBe('string');
        expect(typeof r.requesterName).toBe('string');
        expect(typeof r.title).toBe('string');
        expect(typeof r.status).toBe('string');
        expect(typeof r.appliedOn).toBe('string');
      }
    });

    it('decide approves a request and echoes the new status + note', async () => {
      const repo = await make();
      const first = (await repo.list())[0];
      const decided = await repo.decide(first.id, 'approved', 'Looks fine');
      expect(decided.id).toBe(first.id);
      expect(decided.status).toBe('approved');
      expect(decided.decidedNote).toBe('Looks fine');
    });
  });
}
```

- [ ] **Step 2: Create the contract test** `src/__tests__/contracts/approvals.contract.test.ts`:

```ts
import { approvalsContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockApprovals } from '@/data/mock/approvals.repo';
import { httpApprovals } from '@/data/http/approvals.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { ApprovalRequestDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: ApprovalRequestDTO[] = [
  {
    id: 'ar1',
    type: 'leave',
    requester_id: 'u_rajesh',
    requester_name: 'Rajesh Kumar',
    requester_initials: 'RK',
    title: 'Casual leave · 3 days',
    detail: 'Casual leave 12–14 Jun.',
    from: '2026-06-12',
    to: '2026-06-14',
    reason: 'Family function.',
    priority: 'low',
    status: 'pending',
    applied_on: '2026-06-06',
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  if (method === 'PATCH') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const updated: ApprovalRequestDTO = {
      ...FIXTURE[0],
      status: body.status,
      decided_note: body.decided_note,
    };
    return {
      ok: true,
      status: 200,
      json: async () => updated,
      text: async () => JSON.stringify(updated),
    } as Response;
  }
  return {
    ok: true,
    status: 200,
    json: async () => FIXTURE,
    text: async () => JSON.stringify(FIXTURE),
  } as Response;
}) as unknown as typeof fetch;

approvalsContract('mock', async () => mockApprovals(await createStore()));
approvalsContract('http', async () =>
  httpApprovals(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
```

- [ ] **Step 3: Run the contract test**

Run: `npm test -- src/__tests__/contracts/approvals.contract.test.ts`
Expected: PASS (both `[mock]` and `[http]`).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/contracts/contract.ts src/__tests__/contracts/approvals.contract.test.ts
git commit -m "test: approvals repository contract (mock + http)"
```

---

### Task 9: Wire approvals into the repository factory

**Files:**

- Modify: `src/data/repositories/factory.ts`

- [ ] **Step 1: Add imports** to `src/data/repositories/factory.ts` (with the other repo imports):

```ts
import { mockApprovals } from '@/data/mock/approvals.repo';
import { httpApprovals } from '@/data/http/approvals.repo';
```

- [ ] **Step 2: Wire both factories** — add `approvals: mockApprovals(store),` to `createMockRepositories` and `approvals: httpApprovals(http),` to `createHttpRepositories` (next to the `leave:` line in each).

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors (the `Repositories` interface now requires `approvals`).

- [ ] **Step 4: Commit**

```bash
git add src/data/repositories/factory.ts
git commit -m "feat: wire approvals repository into mock and http factories"
```

---

### Task 10: Approvals feature hooks

**Files:**

- Create: `src/features/approvals/hooks.ts`
- Test: `src/__tests__/features/approvalsHooks.test.tsx`

- [ ] **Step 1: Write the failing test** `src/__tests__/features/approvalsHooks.test.tsx`. Mirror the existing `src/__tests__/features/authHooks.test.tsx` provider setup. Use this:

```tsx
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

async function wrapper() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepositoryProvider repositories={repos}>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
}

describe('approvals hooks', () => {
  it('useApprovals lists pending requests', async () => {
    const { result } = renderHook(() => useApprovals(), { wrapper: await wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
  });

  it('useDecideApproval resolves without throwing', async () => {
    const w = await wrapper();
    const list = renderHook(() => useApprovals(), { wrapper: w });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const firstId = list.result.current.data![0].id;
    const decide = renderHook(() => useDecideApproval(), { wrapper: w });
    await act(async () => {
      await decide.result.current.mutateAsync({ id: firstId, decision: 'approved' });
    });
    expect(decide.result.current.isError).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/features/approvalsHooks.test.tsx`
Expected: FAIL — `@/features/approvals/hooks` does not exist.

- [ ] **Step 3: Implement the hooks** `src/features/approvals/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useApprovals() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.approvals(tenantId),
    queryFn: () => repos.approvals.list(),
  });
}

export interface DecideApprovalVars {
  id: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export function useDecideApproval() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: DecideApprovalVars) =>
      repos.approvals.decide(id, decision, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.approvals(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.principalOverview(tenantId) });
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/features/approvalsHooks.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/hooks.ts src/__tests__/features/approvalsHooks.test.tsx
git commit -m "feat: approvals hooks (useApprovals, useDecideApproval)"
```

---

## Phase 3 — Principal overview (data layer)

### Task 11: Principal overview types, interface, staff seed

**Files:**

- Modify: `src/data/domain/index.ts`
- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/mock/seed.ts`
- Test: `src/__tests__/data/seed.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/data/seed.test.ts`:

```ts
describe('staff seed', () => {
  it('seeds staff with a mix of checked-in states', () => {
    const staff = fullSeed.staff;
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.some((s) => s.checkedIn)).toBe(true);
    expect(staff.some((s) => !s.checkedIn)).toBe(true);
    for (const s of staff) {
      expect(typeof s.teacherId).toBe('string');
      expect(typeof s.phone).toBe('string');
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/data/seed.test.ts`
Expected: FAIL — `fullSeed.staff` is undefined.

- [ ] **Step 3: Add the domain types** to `src/data/domain/index.ts` (after the `ApprovalRequest` interface from Task 5):

```ts
export interface StaffAttendanceEntry {
  teacherId: string;
  name: string;
  initials: string;
  subject: string;
  phone: string;
  checkedIn: boolean;
  checkInAt?: string; // ISO timestamp
}
export interface PrincipalKpis {
  studentsPresentPct: number;
  staffPresent: number;
  staffTotal: number;
  pendingApprovals: number;
}
export interface PrincipalOverview {
  kpis: PrincipalKpis;
  staff: StaffAttendanceEntry[];
}
```

- [ ] **Step 4: Add the repository interface** to `src/data/repositories/types.ts` — add `PrincipalOverview` to the domain import block, then add near `DashboardRepository` (after line 117):

```ts
export interface PrincipalRepository {
  overview(): Promise<PrincipalOverview>;
}
```

and add to `Repositories` (after `dashboard: DashboardRepository;`):

```ts
principal: PrincipalRepository;
```

- [ ] **Step 5: Add the staff seed.** In `src/data/mock/seed.ts`, add `StaffAttendanceEntry` to the domain import block, add `staff: StaffAttendanceEntry[];` to `SeedShape`, and add inside the `seed` object (after the `approvals: [...]` block from Task 5):

```ts
  // ─── Staff (principal overview) ──────────────────────────────────────────────
  staff: [
    {
      teacherId: 'u_aanya',
      name: 'Aanya Krishnan',
      initials: 'AK',
      subject: 'Mathematics',
      phone: '+1 (415) 555-0118',
      checkedIn: true,
      checkInAt: '2026-06-08T08:02:00.000Z',
    },
    {
      teacherId: 'u_rajesh',
      name: 'Rajesh Kumar',
      initials: 'RK',
      subject: 'Physics',
      phone: '+1 (415) 555-0121',
      checkedIn: true,
      checkInAt: '2026-06-08T08:15:00.000Z',
    },
    {
      teacherId: 'u_meera',
      name: 'Meera Krishnan',
      initials: 'MK',
      subject: 'English',
      phone: '+1 (415) 555-0122',
      checkedIn: false,
    },
    {
      teacherId: 'u_vikram',
      name: 'Vikram Desai',
      initials: 'VD',
      subject: 'Chemistry',
      phone: '+1 (415) 555-0123',
      checkedIn: false,
    },
    {
      teacherId: 'u_priya',
      name: 'Priya Mehta',
      initials: 'PM',
      subject: 'Biology',
      phone: '+1 (415) 555-0124',
      checkedIn: true,
      checkInAt: '2026-06-08T07:58:00.000Z',
    },
  ],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/__tests__/data/seed.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/domain/index.ts src/data/repositories/types.ts src/data/mock/seed.ts src/__tests__/data/seed.test.ts
git commit -m "feat: principal overview types, interface, staff seed"
```

---

### Task 12: Principal repo (mock + http) + contract

**Files:**

- Create: `src/data/mock/principal.repo.ts`, `src/data/http/principal.repo.ts`
- Modify: `src/data/http/mappers.ts`, `src/data/repositories/factory.ts`, `src/__tests__/contracts/contract.ts`
- Create: `src/__tests__/contracts/principal.contract.test.ts`

- [ ] **Step 1: Create the mock repo** `src/data/mock/principal.repo.ts`:

```ts
import type { PrincipalRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockPrincipal(store: Store): PrincipalRepository {
  return {
    async overview() {
      await simulateLatency();
      const { tables } = store;
      const staff = [...tables.staff];
      const staffPresent = staff.filter((s) => s.checkedIn).length;
      const pendingApprovals = tables.approvals.filter((a) => a.status === 'pending').length;
      return {
        kpis: {
          studentsPresentPct: 94,
          staffPresent,
          staffTotal: staff.length,
          pendingApprovals,
        },
        staff,
      };
    },
  };
}
```

- [ ] **Step 2: Add the DTO + mapper** to the end of `src/data/http/mappers.ts` (add `PrincipalOverview`, `StaffAttendanceEntry`, `PrincipalKpis` to the import block first):

```ts
// ─── Principal overview ──────────────────────────────────────────────────────
export interface StaffAttendanceEntryDTO {
  teacher_id: string;
  name: string;
  initials: string;
  subject: string;
  phone: string;
  checked_in: boolean;
  check_in_at?: string;
}
export interface PrincipalOverviewDTO {
  kpis: {
    students_present_pct: number;
    staff_present: number;
    staff_total: number;
    pending_approvals: number;
  };
  staff: StaffAttendanceEntryDTO[];
}
export const toPrincipalOverview = (d: PrincipalOverviewDTO): PrincipalOverview => ({
  kpis: {
    studentsPresentPct: d.kpis.students_present_pct,
    staffPresent: d.kpis.staff_present,
    staffTotal: d.kpis.staff_total,
    pendingApprovals: d.kpis.pending_approvals,
  },
  staff: d.staff.map((s) => ({
    teacherId: s.teacher_id,
    name: s.name,
    initials: s.initials,
    subject: s.subject,
    phone: s.phone,
    checkedIn: s.checked_in,
    checkInAt: s.check_in_at,
  })),
});
```

- [ ] **Step 3: Create the http repo** `src/data/http/principal.repo.ts`:

```ts
import type { PrincipalRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toPrincipalOverview, type PrincipalOverviewDTO } from './mappers';

export function httpPrincipal(http: HttpClient): PrincipalRepository {
  return {
    overview: () => http.get<PrincipalOverviewDTO>('/principal/overview').then(toPrincipalOverview),
  };
}
```

- [ ] **Step 4: Wire the factory** — in `src/data/repositories/factory.ts` add imports and `principal: mockPrincipal(store),` / `principal: httpPrincipal(http),`:

```ts
import { mockPrincipal } from '@/data/mock/principal.repo';
import { httpPrincipal } from '@/data/http/principal.repo';
```

- [ ] **Step 5: Add the contract helper** to `src/__tests__/contracts/contract.ts` (add `PrincipalRepository` to imports):

```ts
export function principalContract(name: string, make: () => Promise<PrincipalRepository>) {
  describe(`PrincipalRepository contract [${name}]`, () => {
    it('overview returns kpis and a staff array', async () => {
      const repo = await make();
      const o = await repo.overview();
      expect(typeof o.kpis.studentsPresentPct).toBe('number');
      expect(typeof o.kpis.staffPresent).toBe('number');
      expect(typeof o.kpis.staffTotal).toBe('number');
      expect(typeof o.kpis.pendingApprovals).toBe('number');
      expect(Array.isArray(o.staff)).toBe(true);
      expect(o.staff.length).toBeGreaterThan(0);
      for (const s of o.staff) {
        expect(typeof s.teacherId).toBe('string');
        expect(typeof s.checkedIn).toBe('boolean');
      }
    });
  });
}
```

- [ ] **Step 6: Create the contract test** `src/__tests__/contracts/principal.contract.test.ts`:

```ts
import { principalContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockPrincipal } from '@/data/mock/principal.repo';
import { httpPrincipal } from '@/data/http/principal.repo';
import { createHttpClient } from '@/lib/httpClient';
import type { PrincipalOverviewDTO } from '@/data/http/mappers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const FIXTURE: PrincipalOverviewDTO = {
  kpis: { students_present_pct: 94, staff_present: 3, staff_total: 5, pending_approvals: 4 },
  staff: [
    {
      teacher_id: 'u_aanya',
      name: 'Aanya Krishnan',
      initials: 'AK',
      subject: 'Mathematics',
      phone: '+1 (415) 555-0118',
      checked_in: true,
      check_in_at: '2026-06-08T08:02:00.000Z',
    },
  ],
};

const fetchImpl = jest.fn(
  async () =>
    ({
      ok: true,
      status: 200,
      json: async () => FIXTURE,
      text: async () => JSON.stringify(FIXTURE),
    }) as Response
) as unknown as typeof fetch;

principalContract('mock', async () => mockPrincipal(await createStore()));
principalContract('http', async () =>
  httpPrincipal(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
```

- [ ] **Step 7: Run the contract test**

Run: `npm test -- src/__tests__/contracts/principal.contract.test.ts`
Expected: PASS (`[mock]` and `[http]`).

- [ ] **Step 8: Commit**

```bash
git add src/data/mock/principal.repo.ts src/data/http/principal.repo.ts src/data/http/mappers.ts src/data/repositories/factory.ts src/__tests__/contracts/contract.ts src/__tests__/contracts/principal.contract.test.ts
git commit -m "feat: principal overview repository (mock + http) + contract"
```

---

### Task 13: Principal overview hook

**Files:**

- Create: `src/features/principal/hooks.ts`

- [ ] **Step 1: Implement the hook** `src/features/principal/hooks.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function usePrincipalOverview() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.principalOverview(tenantId),
    queryFn: () => repos.principal.overview(),
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/principal/hooks.ts
git commit -m "feat: usePrincipalOverview hook"
```

---

## Phase 4 — Announcement broadcast (create)

### Task 14: Announcements `create` (interface, mock, http, contract)

**Files:**

- Modify: `src/data/repositories/types.ts`, `src/data/mock/announcements.repo.ts`, `src/data/http/announcements.repo.ts`, `src/data/http/mappers.ts`, `src/__tests__/contracts/contract.ts`, `src/__tests__/contracts/announcements.contract.test.ts`

- [ ] **Step 1: Add the input type + interface method** to `src/data/repositories/types.ts`. Add near the other `New*Input` interfaces (after `NewLeaveInput`):

```ts
export interface NewAnnouncementInput {
  title: string;
  body: string;
  type: Announcement['type'];
}
```

(Ensure `Announcement` is already imported — it is, at line 12.) Then extend `AnnouncementsRepository`:

```ts
export interface AnnouncementsRepository {
  list(): Promise<Announcement[]>;
  create(input: NewAnnouncementInput): Promise<Announcement>;
}
```

- [ ] **Step 2: Read the current mock announcements repo**

Run: `cat src/data/mock/announcements.repo.ts`
(Confirm it currently only has `list`.)

- [ ] **Step 3: Implement `create` in the mock** — replace `src/data/mock/announcements.repo.ts` with:

```ts
import type { AnnouncementsRepository, NewAnnouncementInput } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockAnnouncements(store: Store): AnnouncementsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.announcements];
    },

    async create(input: NewAnnouncementInput) {
      await simulateLatency();
      const today = new Date().toISOString().slice(0, 10);
      const announcement = {
        id: store.genId('an'),
        title: input.title,
        body: input.body,
        type: input.type,
        from: store.session.user.name,
        date: today,
      };
      store.tables.announcements.unshift(announcement);
      await store.persist('announcements');
      return announcement;
    },
  };
}
```

- [ ] **Step 4: Implement `create` in the http repo** — replace `src/data/http/announcements.repo.ts` with:

```ts
import type { AnnouncementsRepository, NewAnnouncementInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAnnouncement, type AnnouncementDTO } from './mappers';

export function httpAnnouncements(http: HttpClient): AnnouncementsRepository {
  return {
    list: () => http.get<AnnouncementDTO[]>('/announcements').then((d) => d.map(toAnnouncement)),

    create: (input: NewAnnouncementInput) =>
      http.post<AnnouncementDTO>('/announcements', input).then(toAnnouncement),
  };
}
```

- [ ] **Step 5: Extend the contract helper** in `src/__tests__/contracts/contract.ts` — add a `create` test to the existing `announcementsContract` describe block:

```ts
it('create returns an announcement echoing the input title and type', async () => {
  const repo = await make();
  const input = { title: 'Contract Notice', body: 'Body text', type: 'info' as const };
  const created = await repo.create(input);
  expect(typeof created.id).toBe('string');
  expect(created.title).toBe(input.title);
  expect(created.type).toBe(input.type);
  expect(typeof created.from).toBe('string');
});
```

- [ ] **Step 6: Extend the http contract fixture** — in `src/__tests__/contracts/announcements.contract.test.ts`, update its `fetchImpl` to handle POST. Replace its `fetchImpl` with one that branches on method:

```ts
const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  if (method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const created = {
      id: 'an_new',
      title: body.title,
      body: body.body,
      type: body.type,
      from: 'Sunita Rao',
      date: '2026-06-08',
    };
    return {
      ok: true,
      status: 201,
      json: async () => created,
      text: async () => JSON.stringify(created),
    } as Response;
  }
  return {
    ok: true,
    status: 200,
    json: async () => FIXTURE,
    text: async () => JSON.stringify(FIXTURE),
  } as Response;
}) as unknown as typeof fetch;
```

(Keep the file's existing `FIXTURE` array and the two `announcementsContract('mock'|'http', …)` registrations.)

- [ ] **Step 7: Run the contract test**

Run: `npm test -- src/__tests__/contracts/announcements.contract.test.ts`
Expected: PASS (`[mock]` and `[http]`, including the new create case).

- [ ] **Step 8: Commit**

```bash
git add src/data/repositories/types.ts src/data/mock/announcements.repo.ts src/data/http/announcements.repo.ts src/__tests__/contracts/contract.ts src/__tests__/contracts/announcements.contract.test.ts
git commit -m "feat: announcement create across interface, mock, http + contract"
```

---

### Task 15: `useCreateAnnouncement` hook

**Files:**

- Modify: `src/features/announcements/hooks.ts`

- [ ] **Step 1: Read the current hook file**

Run: `cat src/features/announcements/hooks.ts`
(Note the existing `useAnnouncements` query and its query key usage.)

- [ ] **Step 2: Append the mutation hook** to `src/features/announcements/hooks.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewAnnouncementInput } from '@/data/repositories/types';

export function useCreateAnnouncement() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAnnouncementInput) => repos.announcements.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.announcements(tenantId) }),
  });
}
```

If `useRepositories`, `useTenantId`, `queryKeys` are already imported at the top of the file, do not duplicate those imports — only add the `useMutation, useQueryClient` and `NewAnnouncementInput` imports that are missing.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/announcements/hooks.ts
git commit -m "feat: useCreateAnnouncement hook"
```

---

## Phase 5 — Principal screens

> Screens use React Native primitives + theme tokens (`Colors`, `Radii`, `Shadows`, `FontFamily`) and the existing shared components (`Card`, `Avatar`, `SectionHeader`, `PunchButton`) imported from `'../../components'` (note the depth: these screens live in `src/screens/principal/`). Follow the visual style of `src/screens/HomeScreen.tsx`.

### Task 16: ApprovalsScreen

**Files:**

- Create: `src/screens/principal/ApprovalsScreen.tsx`

- [ ] **Step 1: Create the screen** `src/screens/principal/ApprovalsScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from '../../components';
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks';
import type { ApprovalRequest } from '@/data/domain';

const REJECT_REASONS = ['Substitute not arranged', 'Insufficient detail', 'Not approved'];

const PRIORITY_COLOR: Record<ApprovalRequest['priority'], string> = {
  high: Colors.absent,
  medium: Colors.late,
  low: Colors.present,
};

export const ApprovalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: approvals = [], isLoading } = useApprovals();
  const decide = useDecideApproval();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const pending = approvals.filter((a) => a.status === 'pending');

  const onApprove = (id: string) => decide.mutate({ id, decision: 'approved' });
  const onReject = (id: string, note: string) => {
    setRejectingId(null);
    decide.mutate({ id, decision: 'rejected', note });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Approvals</Text>
        <Text style={styles.sub}>{pending.length} pending</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : pending.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={48} color={Colors.present} />
            <Text style={styles.emptyText}>All caught up</Text>
          </View>
        ) : (
          pending.map((req, i) => (
            <Animated.View
              key={req.id}
              entering={FadeInDown.delay(60 * i).springify()}
              exiting={FadeOut}
              style={styles.card}
            >
              <View style={styles.cardHead}>
                <Avatar initials={req.requesterInitials} size={40} />
                <View style={styles.cardHeadText}>
                  <Text style={styles.cardTitle}>{req.title}</Text>
                  <Text style={styles.cardMeta}>{req.requesterName}</Text>
                </View>
                <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[req.priority] }]} />
              </View>

              <Text style={styles.detail}>{req.detail}</Text>
              {req.reason ? <Text style={styles.reason}>“{req.reason}”</Text> : null}
              {req.substitute ? (
                <Text style={styles.sub2}>Substitute: {req.substitute}</Text>
              ) : null}

              {rejectingId === req.id ? (
                <View style={styles.reasonWrap}>
                  <Text style={styles.reasonLabel}>Reason for rejection</Text>
                  {REJECT_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={styles.reasonChip}
                      onPress={() => onReject(req.id, r)}
                    >
                      <Text style={styles.reasonChipText}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setRejectingId(null)}>
                    <Text style={styles.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => setRejectingId(req.id)}
                  >
                    <Ionicons name="close" size={16} color={Colors.absent} />
                    <Text style={[styles.btnText, { color: Colors.absent }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => onApprove(req.id)}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={[styles.btnText, { color: Colors.white }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.inkMuted },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeadText: { flex: 1 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  cardMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  detail: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.ink3, marginTop: 12 },
  reason: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  sub2: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radii.full,
  },
  rejectBtn: { borderWidth: 1.5, borderColor: Colors.absentSoft, backgroundColor: Colors.white },
  approveBtn: { backgroundColor: Colors.primary, ...Shadows.card },
  btnText: { fontFamily: FontFamily.bold, fontSize: 14 },
  reasonWrap: { marginTop: 14, gap: 8 },
  reasonLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3 },
  reasonChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  reasonChipText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.ink },
  cancel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
```

> **Note on theme tokens:** if any referenced color (e.g. `Colors.absentSoft`, `Colors.ink3`, `Colors.paper2`) does not exist, open `src/theme/colors.ts` and substitute the nearest existing token. Do not invent new theme tokens in this task.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/principal/ApprovalsScreen.tsx
git commit -m "feat: principal Approvals screen (approve/reject with canned reasons)"
```

---

### Task 17: PrincipalHomeScreen

**Files:**

- Create: `src/screens/principal/PrincipalHomeScreen.tsx`

- [ ] **Step 1: Create the screen** `src/screens/principal/PrincipalHomeScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar, Card, SectionHeader, PunchButton } from '../../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyAttendanceToday, usePunch } from '@/features/teacherAttendance/hooks';
import { usePrincipalOverview } from '@/features/principal/hooks';
import { useApprovals } from '@/features/approvals/hooks';
import { isAppError } from '@/lib/errors';

const SHORTCUTS = [
  { key: 'AnnouncementsScreen', label: 'Broadcast', icon: 'megaphone-outline' as const },
  { key: 'BusScreen', label: 'Live Bus', icon: 'bus-outline' as const },
  { key: 'TeacherDirectoryScreen', label: 'Teachers', icon: 'people-outline' as const },
];

export const PrincipalHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const user = session?.user;

  const { data: overview } = usePrincipalOverview();
  const { data: approvals = [] } = useApprovals();
  const { data: myToday, isLoading: myTodayLoading } = useMyAttendanceToday();
  const punch = usePunch();
  const [msg, setMsg] = useState<string | null>(null);

  const canCheckIn = !myTodayLoading && !myToday?.checkIn;
  const pending = approvals.filter((a) => a.status === 'pending');
  const notCheckedIn = (overview?.staff ?? []).filter((s) => !s.checkedIn);

  const handleCheckIn = () => {
    punch.mutate('in', {
      onSuccess: (day) => {
        const ev = day.checkIn;
        setMsg(ev?.verified ? 'Checked in ✓' : 'Checked in — flagged');
      },
      onError: (e) => setMsg(isAppError(e) ? e.message : 'Could not check in.'),
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.name}>{(user?.name ?? 'Principal').split(' ')[0]} 👋</Text>
            <Text style={styles.sub}>{user?.title ?? 'Principal'}</Text>
          </View>
          <Avatar initials={user?.initials ?? '?'} size={50} />
        </Animated.View>

        {/* Check-in */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Card style={styles.checkCard}>
            <View style={styles.rowCenter}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.checkTitle}>My Attendance</Text>
            </View>
            {canCheckIn ? (
              <PunchButton
                label="Check In"
                icon="enter-outline"
                onPress={handleCheckIn}
                loading={punch.isPending}
              />
            ) : (
              <View style={styles.rowCenter}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.present} />
                <Text style={styles.checkedText}>{msg ?? 'Checked in'}</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* KPIs */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.kpiRow}>
          <Kpi label="Students" value={`${overview?.kpis.studentsPresentPct ?? '—'}%`} />
          <Kpi
            label="Staff in"
            value={overview ? `${overview.kpis.staffPresent}/${overview.kpis.staffTotal}` : '—'}
          />
          <Kpi label="Pending" value={`${overview?.kpis.pendingApprovals ?? pending.length}`} />
        </Animated.View>

        {/* Approvals preview */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
          <SectionHeader
            title="Approvals"
            actionLabel="View All"
            onAction={() => navigation.navigate('Approvals')}
          />
          {pending.slice(0, 3).map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.previewRow}
              onPress={() => navigation.navigate('Approvals')}
            >
              <Avatar initials={a.requesterInitials} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{a.title}</Text>
                <Text style={styles.previewMeta}>{a.requesterName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Staff not checked in */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <SectionHeader title="Not checked in" />
          {notCheckedIn.length === 0 ? (
            <Text style={styles.previewMeta}>Everyone is in.</Text>
          ) : (
            notCheckedIn.map((s) => (
              <View key={s.teacherId} style={styles.previewRow}>
                <Avatar initials={s.initials} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{s.name}</Text>
                  <Text style={styles.previewMeta}>{s.subject}</Text>
                </View>
                <Ionicons name="ellipse" size={10} color={Colors.absent} />
              </View>
            ))
          )}
        </Animated.View>

        {/* Quick shortcuts */}
        <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.shortcut}
              onPress={() => navigation.navigate(s.key)}
            >
              <View style={styles.shortcutIcon}>
                <Ionicons name={s.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greeting: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  name: { fontFamily: FontFamily.extraBold, fontSize: 24, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted, marginTop: 2 },
  checkCard: { padding: 16, marginBottom: 16, gap: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  checkedText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.ink3 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  kpi: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  kpiValue: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.primary },
  kpiLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted, marginTop: 4 },
  section: { marginTop: 20 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
  },
  previewTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  previewMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  shortcutRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  shortcut: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    ...Shadows.card,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.ink },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors. (If any `Colors.*` token is missing, substitute the nearest existing one from `src/theme/colors.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/principal/PrincipalHomeScreen.tsx
git commit -m "feat: principal Home (check-in, KPIs, approvals preview, staff peek, shortcuts)"
```

---

### Task 18: TeacherDirectoryScreen

**Files:**

- Create: `src/screens/principal/TeacherDirectoryScreen.tsx`

- [ ] **Step 1: Create the screen** `src/screens/principal/TeacherDirectoryScreen.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from '../../components';
import { usePrincipalOverview } from '@/features/principal/hooks';

export const TeacherDirectoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: overview } = usePrincipalOverview();
  const staff = overview?.staff ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Teachers</Text>
        <Text style={styles.sub}>{staff.length} staff</Text>

        {staff.map((s, i) => (
          <Animated.View
            key={s.teacherId}
            entering={FadeInDown.delay(50 * i).springify()}
            style={styles.row}
          >
            <Avatar initials={s.initials} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>{s.subject}</Text>
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: s.checkedIn ? Colors.present : Colors.absent },
              ]}
            />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Linking.openURL(`tel:${s.phone}`)}
            >
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  name: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/principal/TeacherDirectoryScreen.tsx
git commit -m "feat: principal Teacher Directory screen"
```

---

### Task 19: Role-gated compose on AnnouncementsScreen

**Files:**

- Modify: `src/screens/AnnouncementsScreen.tsx`

- [ ] **Step 1: Read the current screen** to find where the header and list render and how it imports theme/components.

Run: `cat src/screens/AnnouncementsScreen.tsx`

- [ ] **Step 2: Add imports** at the top of `src/screens/AnnouncementsScreen.tsx` (merge with existing import lines; do not duplicate):

```tsx
import { useState } from 'react';
import { Modal, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateAnnouncement } from '@/features/announcements/hooks';
```

- [ ] **Step 3: Add compose state + handler** inside the component body (after the existing hooks/queries):

```tsx
const { session } = useAuth();
const isPrincipal = session?.user.role === 'principal';
const createAnnouncement = useCreateAnnouncement();
const [composeOpen, setComposeOpen] = useState(false);
const [draftTitle, setDraftTitle] = useState('');
const [draftBody, setDraftBody] = useState('');

const submitAnnouncement = () => {
  if (!draftTitle.trim() || !draftBody.trim()) return;
  createAnnouncement.mutate(
    { title: draftTitle.trim(), body: draftBody.trim(), type: 'info' },
    {
      onSuccess: () => {
        setDraftTitle('');
        setDraftBody('');
        setComposeOpen(false);
      },
    }
  );
};
```

- [ ] **Step 4: Render a compose FAB + modal** before the component's final closing tag (inside the root `View`). Use the screen's existing `Colors`/`FontFamily`/`Radii`/`Shadows` imports:

```tsx
{
  isPrincipal && (
    <TouchableOpacity style={styles.fab} onPress={() => setComposeOpen(true)} activeOpacity={0.9}>
      <Ionicons name="add" size={26} color={Colors.white} />
    </TouchableOpacity>
  );
}

<Modal
  visible={composeOpen}
  animationType="slide"
  transparent
  onRequestClose={() => setComposeOpen(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>New Announcement</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={Colors.inkSoft}
        value={draftTitle}
        onChangeText={setDraftTitle}
      />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Write a message…"
        placeholderTextColor={Colors.inkSoft}
        value={draftBody}
        onChangeText={setDraftBody}
        multiline
      />
      <View style={styles.modalActions}>
        <TouchableOpacity onPress={() => setComposeOpen(false)} style={styles.modalCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submitAnnouncement}
          style={styles.modalSend}
          disabled={createAnnouncement.isPending}
        >
          <Text style={styles.modalSendText}>
            {createAnnouncement.isPending ? 'Posting…' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>;
```

- [ ] **Step 5: Add the styles** to the screen's `StyleSheet.create({...})`:

```ts
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.pop,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  input: {
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.rule,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.inkMuted },
  modalSend: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  modalSendText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white },
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors. (If the screen lacks `Shadows`/`Radii` imports, add them from `'../theme'`.)

- [ ] **Step 7: Commit**

```bash
git add src/screens/AnnouncementsScreen.tsx
git commit -m "feat: principal-only compose announcement on Announcements screen"
```

---

## Phase 6 — Navigation

### Task 20: Navigation param types

**Files:**

- Modify: `src/navigation/types.ts`

- [ ] **Step 1: Add the principal param lists** to `src/navigation/types.ts` (append, and extend `RootStackParamList`):

```ts
// Principal tab navigator params
export type PrincipalTabParamList = {
  PHome: undefined;
  Approvals: undefined;
  PCalendar: undefined;
  PInbox: undefined;
  PProfile: undefined;
};

// Principal Home stack params
export type PrincipalHomeStackParamList = {
  PrincipalHomeScreen: undefined;
  Approvals: undefined;
  AnnouncementsScreen: undefined;
  BusScreen: undefined;
  TeacherDirectoryScreen: undefined;
};
```

Then replace `RootStackParamList` with:

```ts
// Root navigator
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat: navigation param types for principal tabs"
```

---

### Task 21: PrincipalTabNavigator

**Files:**

- Create: `src/navigation/PrincipalTabNavigator.tsx`

- [ ] **Step 1: Create the navigator** `src/navigation/PrincipalTabNavigator.tsx`. It mirrors `MainTabNavigator.tsx`, reusing existing screens for Calendar/Inbox/Profile and the new principal screens for Home/Approvals:

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TabBar } from '../components';
import { PrincipalHomeScreen } from '../screens/principal/PrincipalHomeScreen';
import { ApprovalsScreen } from '../screens/principal/ApprovalsScreen';
import { TeacherDirectoryScreen } from '../screens/principal/TeacherDirectoryScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { BusScreen } from '../screens/BusScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type {
  PrincipalTabParamList,
  PrincipalHomeStackParamList,
  CalendarStackParamList,
  InboxStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const HomeStack = createStackNavigator<PrincipalHomeStackParamList>();
const PrincipalHomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="PrincipalHomeScreen" component={PrincipalHomeScreen} />
    <HomeStack.Screen name="Approvals" component={ApprovalsScreen} />
    <HomeStack.Screen name="AnnouncementsScreen" component={AnnouncementsScreen} />
    <HomeStack.Screen name="BusScreen" component={BusScreen} />
    <HomeStack.Screen name="TeacherDirectoryScreen" component={TeacherDirectoryScreen} />
  </HomeStack.Navigator>
);

const CalendarStack = createStackNavigator<CalendarStackParamList>();
const CalendarStackNavigator = () => (
  <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
    <CalendarStack.Screen name="CalendarScreen" component={CalendarScreen} />
    <CalendarStack.Screen name="ScheduleScreen" component={ScheduleScreen} />
  </CalendarStack.Navigator>
);

const InboxStack = createStackNavigator<InboxStackParamList>();
const InboxStackNavigator = () => (
  <InboxStack.Navigator screenOptions={{ headerShown: false }}>
    <InboxStack.Screen name="ChatScreen" component={ChatScreen} />
    <InboxStack.Screen name="ChatThreadScreen" component={ChatThreadScreen} />
  </InboxStack.Navigator>
);

const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
  </ProfileStack.Navigator>
);

export const PrincipalTabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="PHome" component={PrincipalHomeStackNavigator} />
    <Tab.Screen name="Approvals" component={ApprovalsScreen} />
    <Tab.Screen name="PCalendar" component={CalendarStackNavigator} />
    <Tab.Screen name="PInbox" component={InboxStackNavigator} />
    <Tab.Screen name="PProfile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
```

> **Note:** `TabBar` renders icons/labels from the route names. Open `src/components/ui/TabBar.tsx` and confirm how it maps route name → icon/label. If it switches on the known teacher route names (`Home`, `Calendar`, …), add cases for the principal route names (`PHome`, `Approvals`, `PCalendar`, `PInbox`, `PProfile`) so they get sensible icons/labels. Do this in the next step.

- [ ] **Step 2: Teach TabBar the principal routes.** In `src/components/ui/TabBar.tsx`, add the principal route entries to the existing `TAB_ICONS` map (after the `Profile:` line, before the closing `};` at line 18):

```ts
  PHome: { active: 'home', inactive: 'home-outline' },
  Approvals: { active: 'checkmark-done', inactive: 'checkmark-done-outline' },
  PCalendar: { active: 'calendar', inactive: 'calendar-outline' },
  PInbox: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  PProfile: { active: 'person', inactive: 'person-outline' },
```

and add the matching labels to `TAB_LABELS` (after the `Profile:` line, before its closing `};` at line 26):

```ts
  PHome: 'Home',
  Approvals: 'Approvals',
  PCalendar: 'Calendar',
  PInbox: 'Inbox',
  PProfile: 'Me',
```

(The component already falls back to `route.name` / an `ellipse` icon for unknown routes, so these entries only refine the display.)

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/PrincipalTabNavigator.tsx src/components/ui/TabBar.tsx
git commit -m "feat: PrincipalTabNavigator (Home, Approvals, Calendar, Inbox, Profile)"
```

---

### Task 22: RootNavigator role branch

**Files:**

- Modify: `src/navigation/RootNavigator.tsx`
- Create: `src/__tests__/navigation/principalGate.test.tsx` (leave the existing `authGate.test.tsx` unchanged)

- [ ] **Step 1: Write the failing test** — create `src/__tests__/navigation/principalGate.test.tsx`. It mocks the auth module so `useAuth` returns an authenticated principal session, then asserts the principal Home greeting renders and the teacher-only "Classes" tab does not:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@/navigation/RootNavigator';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import type { Session } from '@/data/domain';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const principalSession: Session = {
  accessToken: 't',
  refreshToken: 'r',
  tenant: { id: 'school_westbrook', name: 'Westbrook Academy' },
  user: {
    id: 'u_sunita',
    name: 'Sunita Rao',
    initials: 'SR',
    title: 'Principal',
    email: 'sunita.r@westbrook.edu',
    phone: '',
    employee: '',
    classroom: '',
    joined: '',
    role: 'principal',
  },
};

jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    status: 'authenticated',
    session: principalSession,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
  useTenantId: () => 'school_westbrook',
}));

it('renders the principal experience for a principal session', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('Welcome,')).toBeTruthy());
  expect(screen.queryByText('Classes')).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/__tests__/navigation/principalGate.test.tsx`
Expected: FAIL — RootNavigator always renders `MainTabNavigator`, so "Welcome," never appears.

- [ ] **Step 3: Implement the role branch** — replace `src/navigation/RootNavigator.tsx` with:

```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { PrincipalTabNavigator } from './PrincipalTabNavigator';
import { useAuth } from '@/features/auth/AuthProvider';
import { Colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { status, session } = useAuth();
  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isPrincipal = session?.user.role === 'principal';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status !== 'authenticated' ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isPrincipal ? (
        <Stack.Screen name="Principal" component={PrincipalTabNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/navigation/principalGate.test.tsx src/__tests__/navigation/authGate.test.tsx`
Expected: PASS (both the new principal case and the existing unauthenticated case).

- [ ] **Step 5: Commit**

```bash
git add src/navigation/RootNavigator.tsx src/__tests__/navigation/principalGate.test.tsx
git commit -m "feat: branch RootNavigator on role (principal vs teacher)"
```

---

## Phase 7 — Final verification

### Task 23: Full suite, lint, typecheck

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites PASS. If a previously-passing snapshot/test broke, open it and reconcile — do not delete assertions to make them pass.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. Fix any reported issues.

- [ ] **Step 4: Manual smoke (optional but recommended).** Start the app (`npm start`), log in with the **Principal** demo chip, and verify: principal tabs render; Approvals approve/reject works and the card disappears; Home shows KPIs + previews; Broadcast posts an announcement; Teacher Directory lists staff; My Attendance check-in works. Then log out and log in as **Teacher** and confirm the teacher experience is unchanged.

- [ ] **Step 5: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "test: full suite green for principal role feature"
```

---

## Self-Review Notes (spec coverage)

- **Role foundation** → Tasks 1–3. **Two demo logins** → Task 4.
- **Navigation split / PrincipalTabNavigator** → Tasks 20–22. Teacher flow untouched (RootNavigator only adds a branch; `MainTabNavigator` unchanged).
- **Principal Home (check-in, KPIs, approvals preview, staff peek, shortcuts)** → Task 17 (data: Tasks 11–13).
- **Approvals (leave + attendance_correction, approve/reject, canned reasons)** → Task 16 (data/hooks: Tasks 5–10).
- **Self check-in reuse** → Task 17 reuses `useMyAttendanceToday`/`usePunch`/`PunchButton`; `MyAttendanceScreen` reused in the principal Profile stack (Task 21).
- **Reuse add-ons:** Broadcast announcements → Tasks 14–15, 19; Live bus → Task 21 (BusScreen in Home stack + Home shortcut); School calendar → Task 21 (PCalendar tab); Teacher directory → Task 18.
- **Mock-first behind the interface** → every new method added to `Repositories` with mock + http + contract tests (Tasks 6–9, 12, 14).
- **Out of scope** (teacher quick presets, teacher-side correction raise UI, fees/payroll/SIS) → intentionally not in any task.
