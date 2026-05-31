# Teacher App — Swappable Data Architecture (Mock → Live API)

**Date:** 2026-06-01
**Status:** Approved design, ready for implementation planning

## Problem

The teacher app has a complete UI — 24 screens, 5-tab navigation, theming, components,
and zod validation. But every screen imports static arrays directly from a single
`src/data/index.ts` (`import { classes, students } from '../data'`). There is no service
layer, no async loading/error/empty states, no real auth, and no place to swap in a live
backend. Pointing the app at a real API today would mean editing all 24 screens.

## Goal

Introduce a clean, production-grade data-access layer so that:

- Every screen reads and writes through a swappable abstraction, never a static import.
- Mock data is served behind that abstraction (simulated async, persistent writes), and
  switching to a live REST API is a one-line config change — not a rewrite.
- Full CRUD works end-to-end with optimistic updates.
- A real SaaS auth model is in place: token-based auth, persisted session, auth-gated
  navigation, and a current-user/tenant (school) context threaded into every request.
- The mock and live adapters are provably reconcilable via shared contract tests.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Live backend target | Backend-agnostic; **REST** as the default shape |
| Server-state management | **TanStack Query (React Query)** |
| Functional scope | **Full CRUD + writes** with optimistic updates |
| Auth & tenancy | **Full SaaS auth**: access/refresh tokens, session persistence, auth-gated nav, tenant (school) context on every request, role awareness |
| Swap boundary | **Approach A — Repository (ports & adapters) + factory** |

## Architecture

Five layers; each depends only on the layer below. Screens never import data — they import hooks.

```
Screens (presentational)        "show me classes" -> useClasses()
   v calls hooks only
Feature hooks (TanStack Query)  useClasses(), useMarkAttendance()
   - own query keys, caching, optimistic updates, retries
   v calls repositories via context
Repository interfaces (ports)   ClassesRepository, ExamsRepository, ...
   v resolved at runtime by a factory (env flag)
Adapters (two implementations)
   - MockAdapter -> in-memory store + AsyncStorage + simulated latency
   - HttpAdapter -> REST client + DTO mappers
   v
Infrastructure                  httpClient (auth+tenant+errors), queryClient,
                                tokenStore (SecureStore), asyncStore
```

**Stable contract:** the domain types (`Class`, `Student`, `Exam`, ...) are the contract.
Both adapters return identical domain shapes. The HttpAdapter maps backend DTOs to domain
types so a backend field change never reaches a screen. The MockAdapter stores domain
objects directly.

**The swap:** `config/env.ts` exposes `DATA_SOURCE`. The repository factory returns the
Mock set or the Http set. Nothing else in the app knows which is active. Flipping the flag
moves the whole app from mock to live.

**Providers:** wrapped once in `AppProviders.tsx`:
`QueryClientProvider` -> `AuthProvider` -> `RepositoryProvider`. The auth-gated
`RootNavigator` shows Login vs Main based on session.

## Folder structure

```
src/
  config/
    env.ts                 # DATA_SOURCE = 'mock'|'live', API_BASE_URL
  lib/
    queryClient.ts         # TanStack Query client (staleTime, retry, key helpers)
    httpClient.ts          # fetch wrapper: base URL, auth header, X-Tenant-Id, error normalize
    tokenStore.ts          # Expo SecureStore read/write/clear (access + refresh)
    asyncStore.ts          # AsyncStorage JSON helpers (mock persistence)
    errors.ts              # AppError {code,status,message}, isAppError()
    latency.ts             # simulateLatency(), maybeFail() for the mock
  data/
    domain/                # stable contract — pure domain types (NO presentation/colors)
      class.ts student.ts exam.ts ... index.ts
    repositories/
      types.ts             # all *Repository interfaces (ports) + Repositories bundle
      RepositoryContext.tsx# provider + useRepositories() hook
      factory.ts           # picks mock|http bundle from env
    mock/
      seed.ts              # today's fixtures, moved here, color-stripped
      store.ts             # in-memory tables + AsyncStorage hydrate/persist
      *.repo.ts            # one mock repo per domain
    http/
      *.repo.ts            # one http repo per domain
      mappers.ts           # DTO <-> domain mapping
  features/
    auth/  AuthProvider.tsx  hooks.ts  tokenStore usage  (useLogin/useSession/useLogout)
    classes/ hooks.ts
    students/ hooks.ts
    exams/ hooks.ts  grades/ hooks.ts  attendance/ hooks.ts  ...one per domain
  ui/
    state/ ErrorState.tsx  EmptyState.tsx  Skeleton.tsx   # new shared state primitives
  providers/AppProviders.tsx
```

## Repository contracts

Every domain repo is an interface returning Promises of domain types.

```ts
// data/repositories/types.ts
export interface ClassesRepository {
  list(): Promise<Class[]>;
  get(id: string): Promise<Class>;
}
export interface AttendanceRepository {
  forClass(classId: string, date: string): Promise<AttendanceRecord[]>;
  save(classId: string, date: string, records: AttendanceRecord[]): Promise<void>;
}
export interface ExamsRepository {
  list(filter?: ExamFilter): Promise<Exam[]>;
  get(id: string): Promise<Exam>;
  create(input: NewExamInput): Promise<Exam>;
  update(id: string, patch: Partial<NewExamInput>): Promise<Exam>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  auth: AuthRepository; classes: ClassesRepository; students: StudentsRepository;
  attendance: AttendanceRepository; timetable: TimetableRepository; exams: ExamsRepository;
  grades: GradesRepository; assignments: AssignmentsRepository; chat: ChatRepository;
  announcements: AnnouncementsRepository; calendar: CalendarRepository;
  library: LibraryRepository; payroll: PayrollRepository; leave: LeaveRepository;
  dashboard: DashboardRepository; // quickStats
}
```

**Domains covered (15):** auth, classes, students, attendance, timetable, exams, grades,
assignments, chat, announcements, calendar, library, payroll (payslips), leave, dashboard.
That covers every screen end-to-end.

The MockAdapter and HttpAdapter are each an object implementing `Repositories`. The factory
returns one or the other based on `DATA_SOURCE`.

## Mock adapter

A real in-memory database, not just returned arrays.

```
mock/store.ts
  - tables: { classes: Class[], students: Student[], exams: Exam[], ... }
  - first run: hydrate from AsyncStorage; if empty, load from seed.ts
  - every write mutates the table AND persists it to AsyncStorage
  - optimistic writes survive app reload -> feels like a real backend
```

Each mock repo wraps its table with `simulateLatency()` (150–500ms) for real loading
states, and an optional `maybeFail()` toggle to exercise error paths. IDs are generated
locally (`gen('exam')` -> `exam_ab12`).

```ts
// mock/exams.repo.ts
export const mockExams = (db: Store): ExamsRepository => ({
  async list(filter) { await simulateLatency(); return query(db.exams, filter); },
  async create(input) {
    await simulateLatency();
    const exam = { id: gen('exam'), ...input };
    db.exams.unshift(exam); await db.persist('exams');
    return exam;
  },
  // get/update/remove similar
});
```

## HTTP adapter

Written as if the backend already exists.

```ts
// http/exams.repo.ts
export const httpExams = (http: HttpClient): ExamsRepository => ({
  list:   (f) => http.get('/exams', { params: f }).then(d => d.map(toExam)),
  get:    (id) => http.get(`/exams/${id}`).then(toExam),
  create: (input) => http.post('/exams', toExamDTO(input)).then(toExam),
  update: (id, p) => http.patch(`/exams/${id}`, toExamDTO(p)).then(toExam),
  remove: (id) => http.delete(`/exams/${id}`),
});
```

`httpClient` centralizes cross-cutting concerns: prepends `API_BASE_URL`, attaches
`Authorization: Bearer <token>` and `X-Tenant-Id: <schoolId>` from the auth store, parses
JSON, and normalizes any non-2xx into a typed `AppError`. On `401` it triggers the
refresh-token flow (one retry) and logs out if refresh fails. **Mappers**
(`toExam`/`toExamDTO`) are the only code that knows the backend wire format — the single
seam that absorbs backend changes.

## Auth & multi-tenancy

```
AuthRepository: login(email,pw) -> Session; refresh(token) -> Session; me() -> User; logout()
  Session = { accessToken, refreshToken, user, tenant }
  User    = { id, name, role: 'teacher', ... }
  Tenant  = { id: schoolId, name }
```

- `tokenStore` persists tokens in Expo **SecureStore** (encrypted), not AsyncStorage.
- `AuthProvider` bootstraps on launch: read token -> `me()` -> set session, else
  unauthenticated. Exposes `useSession()`, `useLogin()`, `useLogout()`.
- Auth-gated nav: `RootNavigator` renders `Login` with no session, `Main` when
  authenticated. Logout clears tokens and resets the query cache.
- Multi-tenancy: `tenant.id` (schoolId) from the session is injected by `httpClient` as
  `X-Tenant-Id` on every request; the mock store filters by tenant. Tenant scoping is
  threaded through the whole app from day one.
- Mock login accepts any credentials, returns a fake token + the seeded teacher + a demo
  school.

## Data flow

**Read — `ClassesScreen`:**
```
useClasses() -> useQuery(['classes', tenantId], () => repos.classes.list())
   MOCK: simulateLatency -> store.classes (tenant-filtered)
   LIVE: GET /classes (auth + tenant headers) -> map DTOs -> Class[]
Render: isLoading -> <Skeleton/>, error -> <ErrorState onRetry/>, [] -> <EmptyState/>, data -> list
```

**Write — mark attendance (optimistic):**
```
useMarkAttendance() = useMutation(records => repos.attendance.save(classId,date,records), {
   onMutate:  cancel queries, snapshot, optimistically write cache  -> instant UI
   onError:   rollback to snapshot + toast
   onSettled: invalidate ['attendance', classId, date]            -> reconcile with source
})
   MOCK: persist to AsyncStorage (survives reload)
   LIVE: POST /classes/:id/attendance
```

Every mutating screen (attendance, new exam, grades entry, leave application, chat send)
uses this identical optimistic pattern. Screen code is the same whether mock or live is active.

## Error handling & UI states

- `httpClient` normalizes all failures to typed `AppError { code, status, message }`; the
  mock throws the same type via `maybeFail()`.
- TanStack Query defaults: `retry: 2`, exponential backoff, `staleTime: 30s`; `401`
  excluded from retry (handled by refresh/logout).
- Three shared UI primitives — `<Skeleton/>`, `<ErrorState onRetry/>`, `<EmptyState/>` —
  used by every screen for consistent loading/error/empty handling.
- Mutations: optimistic update + rollback + `Toast` (component already exists).

## Testing — the reconciliation guarantee

- **Contract tests:** one shared suite per domain interface, run against both the mock and
  a fixture-backed http adapter. If they diverge in shape or behavior, the tests fail. This
  is what makes "easily reconcile with live API" a guarantee, not a hope.
- **Mapper tests:** DTO <-> domain round-trips.
- **Hook tests:** render with a test `QueryClient` + injected mock repo; assert
  loading -> data -> error transitions and optimistic rollback.
- Tooling to add: Jest + React Native Testing Library (not currently in the project).

## Config

`config/env.ts`: `DATA_SOURCE` (`mock`|`live`), `API_BASE_URL`, via Expo public env vars.
Default `mock`. One change flips the entire app between mock and live.

## Targeted cleanup folded into this work

Today the data carries presentation (`color: Colors.pink` lives in class/exam/timetable
records). A real API will not return theme colors. Presentation is stripped from the domain
types; colors are derived on the client (by index/hash, or a small UI mapping). This is
required — otherwise the live swap breaks.

## Incremental migration plan (no big-bang)

1. Scaffold infrastructure (env, queryClient, httpClient, errors, providers) + domain types
   (color-stripped).
2. Move fixtures -> `mock/seed.ts`; build the mock store + AsyncStorage persistence.
3. Auth vertical slice first (login -> session -> gated nav) — proves the full pattern
   end-to-end.
4. Then one domain at a time: define interface -> mock repo -> http repo -> hooks ->
   migrate screen -> contract test. Order: Classes/Students/Attendance first, then the rest.
5. Delete the old `src/data/index.ts` re-export once every screen is migrated.

The app keeps running throughout; each domain is independently shippable.

## New dependencies

- `@tanstack/react-query`
- `@react-native-async-storage/async-storage`
- `expo-secure-store`
- dev: `jest`, `jest-expo`, `@testing-library/react-native`

## Out of scope (for now)

- The actual backend implementation (this is the client contract it must satisfy).
- Offline-first sync / conflict resolution beyond AsyncStorage persistence of mock writes.
- Push notifications, real-time chat sockets (chat send is request/response for now).
- Roles beyond `teacher` (model leaves room, but only teacher is wired).
