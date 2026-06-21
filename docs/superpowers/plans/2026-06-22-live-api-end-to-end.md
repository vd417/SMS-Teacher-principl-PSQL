# Live API End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Teacher App run entirely against the real `sms-backend` API — delete the mock layer, harden the HTTP transport (envelope unwrap, error envelope, 401→refresh retry), reshape auth/session, extend the backend `/v1/auth/me`, align every module's DTOs with zod boundary schemas, and add cursor-ready repos (real infinite scroll on the class roster).

**Architecture:** Repositories stay behind `RepositoryContext`, but only the HTTP implementations remain. A reworked `httpClient` is the single place that understands the wire envelope (`{data}` / `{data,next_cursor}` / `{error}`) and the token-refresh retry. Each module gets a zod schema (`*.schema.ts`) that is both the DTO type (`z.infer`) and a runtime validator; mappers convert validated DTOs → domain types. List repos uniformly return `{ items, nextCursor }`.

**Tech Stack:** Expo / React Native 0.81, React 19, TypeScript, `@tanstack/react-query` v5, `zod` v4, `expo-secure-store`. Backend: ASP.NET minimal APIs (C#), snake_case JSON, Dapper.

## Global Constraints

- Wire JSON is **snake_case**; all DTO schemas use snake_case keys.
- Every response is enveloped: single = `{ "data": T }`; list = `{ "data": T[], "next_cursor": string|null }`; error = `{ "error": { "code", "message", "details"? } }`.
- All routes are under `/v1`; `API_BASE_URL` includes `/v1`.
- Auth login / OTP-verify return **tokens only** (`{ access_token, refresh_token }`); identity comes from `GET /v1/auth/me`.
- `roles` is a string array on the wire; the app collapses it to a single `Role` by precedence `principal` > `teacher`.
- Pagination: only `GET /v1/classes/{classId}/students` truly pages (`limit` 1–200 default 50, `cursor`, `next_cursor`). All other lists return the full array with `next_cursor` effectively null.
- TDD: write the failing test first, watch it fail, implement minimally, watch it pass, commit. Run `npx tsc --noEmit` and `npx jest <file>` for checks.
- Commit after every task. Branch: `field-alignment-canonical`.
- Resolved field gaps (no backend source — apply these defaults in mappers): approvals `requester_name`→`'Staff member'` when absent, `requester_initials`→`'—'`, `title`/`detail` synthesized from `type`+dates, `priority`→`'medium'`; exam-papers `topics`→`[]`, `class_name`→`''`; threads `initials`→derived from `name`, `online`→`false`. DateTime wire values are normalized to `YYYY-MM-DD` (or kept ISO for timestamps) in mappers.

---

## File Structure

**New shared files**

- `src/lib/envelope.ts` — envelope types + `unwrapData`/`unwrapList` helpers, `Page<T>` type.
- `src/lib/refreshLock.ts` — single-flight refresh coordinator.
- `src/data/http/schemas/` — one zod schema module per domain area (e.g. `auth.schema.ts`, `sis.schema.ts`, …) OR co-located `*.schema.ts` next to each repo. This plan co-locates: `src/data/http/<module>.schema.ts`.
- `scripts/smoke/teacher-smoke.ts` — live smoke test.

**Modified shared files**

- `src/lib/httpClient.ts` — envelope unwrap, error envelope, refresh-retry, list helper.
- `src/config/env.ts` — drop `DATA_SOURCE`; `API_BASE_URL` includes `/v1`.
- `src/data/repositories/factory.ts` — remove `createMockRepositories`.
- `src/providers/AppProviders.tsx` — always build HTTP repos; remove mock store path.
- `src/lib/queryClient.ts` — query keys for paginated roster; keep others.
- `src/data/http/mappers.ts` — re-pointed at zod-inferred DTO types; field fixes per module.
- `src/data/http/*.repo.ts` — every repo: `/v1`-relative paths already (baseUrl carries `/v1`), envelope-aware via httpClient, list methods return `{ items, nextCursor }`.
- `src/data/repositories/types.ts` — list method return types become `Page<T>`; `students.listByClass` takes `{ limit?, cursor? }`.
- `src/features/*/hooks.ts` — list hooks adapt to `Page<T>`; roster hook → `useInfiniteQuery`.
- `src/screens/*` — list screens → `FlatList`; `ClassDetailScreen` → infinite scroll.

**Deleted**

- `src/data/mock/**` (all files), `src/data/http/__tests__/*.canonical.test.ts`.

**Backend**

- `sms-backend/src/Sms.Api/Endpoints/AuthEndpoints.cs` (`/me` handler) + the auth repository read + tests.

---

## Phase 0 — Transport foundation

### Task 0.1: Envelope helpers

**Files:**

- Create: `src/lib/envelope.ts`
- Test: `src/lib/__tests__/envelope.test.ts`

**Interfaces:**

- Produces: `type Page<T> = { items: T[]; nextCursor: string | null }`; `unwrapData<T>(raw: unknown): T`; `unwrapList<T>(raw: unknown): { data: unknown[]; nextCursor: string | null }`.

- [ ] **Step 1: Write failing test**

```typescript
import { unwrapData, unwrapList } from '../envelope';

test('unwrapData returns the data member', () => {
  expect(unwrapData({ data: { id: '1' } })).toEqual({ id: '1' });
});
test('unwrapList returns rows + nextCursor from CursorPage', () => {
  expect(unwrapList({ data: [{ id: '1' }], next_cursor: 'c2' })).toEqual({
    data: [{ id: '1' }],
    nextCursor: 'c2',
  });
});
test('unwrapList treats a bare DataEnvelope list as a single page', () => {
  expect(unwrapList({ data: [{ id: '1' }] })).toEqual({ data: [{ id: '1' }], nextCursor: null });
});
```

- [ ] **Step 2: Run, expect fail** — `npx jest src/lib/__tests__/envelope.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement**

```typescript
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data;
  throw new Error('expected an enveloped { data } response');
}

export function unwrapList(raw: unknown): { data: unknown[]; nextCursor: string | null } {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const r = raw as { data: unknown; next_cursor?: string | null };
    if (!Array.isArray(r.data)) throw new Error('expected list data to be an array');
    return { data: r.data, nextCursor: r.next_cursor ?? null };
  }
  throw new Error('expected an enveloped list response');
}
```

- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `git add src/lib/envelope.ts src/lib/__tests__/envelope.test.ts && git commit -m "feat(http): envelope unwrap helpers"`

### Task 0.2: httpClient — error envelope + envelope-aware verbs + list + refresh retry

**Files:**

- Modify: `src/lib/httpClient.ts`
- Modify: `src/lib/errors.ts` (add optional `details`)
- Create: `src/lib/refreshLock.ts`
- Test: `src/lib/__tests__/httpClient.test.ts`

**Interfaces:**

- Consumes: `unwrapData`, `unwrapList`, `Page` from `envelope.ts`.
- Produces: `HttpClient` with `get<T>`, `getList<T>(path, opts) => Promise<Page<T>>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>` — all unwrapping `data`. New config field `onRefresh?: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string } | null>` and `onAuthLost?: () => void`. `AuthSnapshot` unchanged. `refreshLock` exports `runSingleFlight<T>(fn: () => Promise<T>): Promise<T>`.

- [ ] **Step 1: Write failing tests** (use `fetchImpl` stub):

```typescript
import { createHttpClient } from '../httpClient';
import { isAppError } from '../errors';

const auth = { accessToken: 'a', tenantId: 't' };
function res(status: number, body: unknown) {
  return { ok: status < 400, status, statusText: '', json: async () => body } as Response;
}

test('get unwraps {data}', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => auth,
    fetchImpl: async () => res(200, { data: { id: '1' } }),
  });
  expect(await http.get('/x')).toEqual({ id: '1' });
});

test('getList returns items + nextCursor', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => auth,
    fetchImpl: async () => res(200, { data: [{ id: '1' }], next_cursor: 'c2' }),
  });
  expect(await http.getList('/x')).toEqual({ items: [{ id: '1' }], nextCursor: 'c2' });
});

test('error envelope maps to AppError code+message', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => auth,
    fetchImpl: async () => res(422, { error: { code: 'invalid_request', message: 'bad' } }),
  });
  await expect(http.get('/x')).rejects.toMatchObject({
    code: 'invalid_request',
    status: 422,
    message: 'bad',
  });
});

test('401 triggers single refresh then retries once', async () => {
  let calls = 0;
  const fetchImpl = async (_url: string, init?: RequestInit) => {
    calls++;
    if (calls === 1) return res(401, { error: { code: 'unauthorized', message: 'no' } });
    return res(200, { data: { ok: true } });
  };
  const onRefresh = jest.fn(async () => ({ accessToken: 'a2', refreshToken: 'r2' }));
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => auth,
    fetchImpl: fetchImpl as typeof fetch,
    onRefresh,
  });
  expect(await http.get('/x')).toEqual({ ok: true });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(calls).toBe(2);
});

test('refresh failure calls onAuthLost and throws', async () => {
  const onAuthLost = jest.fn();
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => auth,
    fetchImpl: async () => res(401, { error: { code: 'unauthorized', message: 'no' } }),
    onRefresh: async () => null,
    onAuthLost,
  });
  await expect(http.get('/x')).rejects.toBeTruthy();
  expect(onAuthLost).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, expect fail.**
- [ ] **Step 3: Implement.** Add to `errors.ts`: `details?: Record<string, string[]>` on `AppErrorShape` and `AppError` (assign in ctor). Create `refreshLock.ts`:

```typescript
let inFlight: Promise<unknown> | null = null;
export async function runSingleFlight<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight) return inFlight as Promise<T>;
  inFlight = fn().finally(() => {
    inFlight = null;
  });
  return inFlight as Promise<T>;
}
```

Rewrite `httpClient.ts` `request` to: send headers as today; on `!res.ok` parse `{ error }` → `AppError({ code: error.code, status, message: error.message, details: error.details })` (fallback to `http_<status>`/statusText when no envelope); on 401 (and `path !== '/auth/refresh'` and not already retried and `onRefresh` present) call `runSingleFlight(() => onRefresh(getAuth-refresh))` — but the client doesn't hold the refresh token; instead `onRefresh` is parameterless-from-client: change signature to `onRefresh?: () => Promise<boolean>` returning whether a new token is now in the snapshot. Retry once reading the fresh snapshot; on false → `onAuthLost?.()` then throw. Success path: `return res.status === 204 ? undefined : await res.json()` (raw). Add `get`/`post`/etc. to call `unwrapData` on the raw JSON (except 204), and `getList` to call `unwrapList` and shape `{ items, nextCursor }`. Update the `HttpClient` interface + `HttpClientConfig` accordingly.

> Note: `onRefresh: () => Promise<boolean>` keeps the refresh-token secret in the AuthProvider; the client only learns success/failure and re-reads `getAuth()`.

- [ ] **Step 4: Run, expect pass.** Adjust the 401 test's `onRefresh` to `async () => true` and have it update a mutable `auth.accessToken` before returning; adjust the failure test to `async () => false`.
- [ ] **Step 5: Commit** — `git commit -am "feat(http): envelope-aware client with error envelope and 401 refresh retry"`

### Task 0.3: env + factory + AppProviders — live only

**Files:**

- Modify: `src/config/env.ts`, `src/data/repositories/factory.ts`, `src/providers/AppProviders.tsx`
- Delete: `src/data/mock/**`, `src/data/http/__tests__/bus.canonical.test.ts`, `src/data/http/__tests__/mappers.canonical.test.ts`

- [ ] **Step 1:** Delete mocks + contract tests: `git rm -r src/data/mock && git rm src/data/http/__tests__/bus.canonical.test.ts src/data/http/__tests__/mappers.canonical.test.ts`
- [ ] **Step 2:** `env.ts` → remove `DataSource`/`DATA_SOURCE`; keep `API_BASE_URL` (default `https://api.schooldesk.local/v1`) and `GOOGLE_MAPS_API_KEY`.
- [ ] **Step 3:** `factory.ts` → delete `createMockRepositories` and its imports; keep `createHttpRepositories`.
- [ ] **Step 4:** `AppProviders.tsx` → remove the mock branch and `createStore`/`createMockRepositories` imports; always:

```typescript
const http = createHttpClient({
  baseUrl: env.API_BASE_URL,
  getAuth: () => authSnapshot.get(),
  onRefresh: () => authBridge.refresh(), // see Task 2.x
  onAuthLost: () => authBridge.signOut(),
});
setRepositories(createHttpRepositories(http));
```

(Introduce `authBridge` in Task 2.3; until then stub `onRefresh: async () => false`.)

- [ ] **Step 5:** Run `npx tsc --noEmit` — fix references to deleted mock symbols. Commit — `git commit -am "refactor: delete mock data layer; live-only repositories"`

---

## Phase 1 — Backend `/v1/auth/me` extension

### Task 1.1: Extend `/auth/me` to return the display profile

**Files:**

- Modify: `sms-backend/src/Sms.Api/Endpoints/AuthEndpoints.cs` (the `/me` handler)
- Modify: the auth repository (`AuthRepository.GetByIdAsync` / add a `GetProfileAsync`) under `Sms.Api/Auth` or `Sms.Shared.Kernel.Auth`
- Test: backend auth integration test under `sms-backend/tests/...`

- [ ] **Step 1:** Write/extend an integration test asserting `GET /v1/auth/me` returns `data.name`, `data.email`, `data.tenant_name` for a seeded teacher. Run, expect fail.
- [ ] **Step 2:** Add `GetProfileAsync(Guid userId)` to the auth repository returning `name, title, email, phone, employee, classroom, joined, tenant_name` (join `dbo.Users`/teacher profile + tenant). Run as the existing authenticated context (token already carries `tenant_id`).
- [ ] **Step 3:** Update the `/me` handler to fetch the profile by `sub` and return:

```csharp
return Results.Ok(new DataEnvelope<object>(new {
  id = sub,
  tenant_id = http.User.FindFirst("tenant_id")?.Value,
  roles = http.User.FindAll("role").Select(c => c.Value).ToArray(),
  name = p.Name, title = p.Title, email = p.Email, phone = p.Phone,
  employee = p.Employee, classroom = p.Classroom, joined = p.Joined, tenant_name = p.TenantName,
}));
```

- [ ] **Step 4:** Run backend tests, expect pass. `dotnet build` clean.
- [ ] **Step 5:** Commit in the backend repo — `git -C ../sms-backend commit -am "feat(auth): /v1/auth/me returns teacher display profile"`

---

## Phase 2 — Auth & session reshape (app)

### Task 2.1: Auth zod schema + me mapper

**Files:**

- Create: `src/data/http/auth.schema.ts`
- Modify: `src/data/http/mappers.ts` (auth section)
- Test: `src/data/http/__tests__/auth.schema.test.ts`

**Interfaces:**

- Produces: `tokenSchema` (`{ access_token, refresh_token }`), `meSchema` (id, tenant_id, roles[], name, title, email, phone, employee, classroom, joined, tenant_name), `toSessionFromMe(tokens, me) => Session`, `pickRole(roles: string[]) => Role`.

- [ ] **Step 1: Failing test**

```typescript
import { pickRole, meSchema, toSessionFromMe } from '../auth.schema';
test('pickRole prefers principal', () => {
  expect(pickRole(['teacher', 'principal'])).toBe('principal');
  expect(pickRole(['teacher'])).toBe('teacher');
});
test('toSessionFromMe builds a Session', () => {
  const me = meSchema.parse({
    id: 'u1',
    tenant_id: 't1',
    roles: ['teacher'],
    name: 'A B',
    title: 'Teacher',
    email: 'a@b.c',
    phone: '1',
    employee: 'E1',
    classroom: '9A',
    joined: '2020',
    tenant_name: 'West',
  });
  const s = toSessionFromMe({ accessToken: 'a', refreshToken: 'r' }, me);
  expect(s.user.name).toBe('A B');
  expect(s.tenant).toEqual({ id: 't1', name: 'West' });
  expect(s.user.role).toBe('teacher');
});
```

- [ ] **Step 2: Run, fail.**
- [ ] **Step 3: Implement** zod schemas + `pickRole` (`roles.includes('principal') ? 'principal' : 'teacher'`) + `toSessionFromMe`. Derive `initials` from `name` if backend omits.
- [ ] **Step 4: Run, pass.**
- [ ] **Step 5: Commit.**

### Task 2.2: httpAuth repo aligned to real shapes

**Files:**

- Modify: `src/data/http/auth.repo.ts`
- Modify: `src/data/repositories/types.ts` (`AuthRepository`)
- Test: `src/data/http/__tests__/auth.repo.test.ts`

**Interfaces:**

- Produces: `AuthRepository` where `login`/`verifyOtp` return `Session` by: POST tokens → save snapshot → GET `/auth/me` → `toSessionFromMe`. `requestOtp` returns `OtpChallenge` from `{ sent: true }` (channel inferred from identifier; `destination` = masked identifier; `devCode` undefined). `refresh(refreshToken)` → tokens only (no Session); change return to `Promise<{ accessToken, refreshToken }>`. `me()` → `User`. `logout(refreshToken)` posts `{ refresh_token }`.

- [ ] **Step 1:** Test with a fake `HttpClient` that returns tokens for `/auth/otp/verify` then me for `/auth/me`; assert `verifyOtp` yields a Session with role. Test `requestOtp` returns `{ channel, destination }`.
- [ ] **Step 2: Run, fail.**
- [ ] **Step 3: Implement** (paths are `/auth/...`, baseUrl carries `/v1`):

```typescript
export function httpAuth(http: HttpClient): AuthRepository {
  const fetchSession = async (t: { accessToken: string; refreshToken: string }) => {
    authSnapshot.set({ accessToken: t.accessToken, tenantId: authSnapshot.get().tenantId });
    const me = meSchema.parse(await http.get('/auth/me'));
    authSnapshot.set({ accessToken: t.accessToken, tenantId: me.tenant_id });
    return toSessionFromMe(t, me);
  };
  return {
    login: async (email, password) => {
      const t = tokenSchema.parse(await http.post('/auth/login', { email, password }));
      return fetchSession({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
    verifyOtp: async (identifier, code) => {
      const t = tokenSchema.parse(await http.post('/auth/otp/verify', { identifier, code }));
      return fetchSession({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
    requestOtp: async (identifier) => {
      await http.post('/auth/otp/request', { identifier });
      const isEmail = identifier.includes('@');
      return { channel: isEmail ? 'email' : 'sms', destination: maskIdentifier(identifier) };
    },
    refresh: async (refreshToken) => {
      const t = tokenSchema.parse(
        await http.post('/auth/refresh', { refresh_token: refreshToken })
      );
      return { accessToken: t.access_token, refreshToken: t.refresh_token };
    },
    me: async () => toUserFromMe(meSchema.parse(await http.get('/auth/me'))),
    logout: (refreshToken: string) => http.post('/auth/logout', { refresh_token: refreshToken }),
  };
}
```

Update `AuthRepository` interface: `refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>`, `logout(refreshToken: string): Promise<void>`. Add `maskIdentifier` + `toUserFromMe`.

- [ ] **Step 4: Run, pass.**
- [ ] **Step 5: Commit.**

### Task 2.3: AuthProvider — token-only flows, refresh bridge, me-built session

**Files:**

- Modify: `src/features/auth/AuthProvider.tsx`
- Create: `src/features/auth/authBridge.ts`
- Modify: `src/providers/AppProviders.tsx` (wire `authBridge` into `onRefresh`/`onAuthLost`)
- Test: `src/features/auth/__tests__/authProvider.test.tsx` (light — rehydrate path)

**Interfaces:**

- Produces: `authBridge` with `refresh(): Promise<boolean>` (reads stored refresh token, calls `repos.auth.refresh`, persists, updates snapshot, returns success) and `signOut(): Promise<void>`. `AuthProvider` registers its implementation into `authBridge` on mount.

- [ ] **Step 1:** Test that on rehydrate with stored tokens+session, `me()` rebuilds the user and status becomes authenticated.
- [ ] **Step 2: Run, fail.**
- [ ] **Step 3: Implement.** `authBridge.ts` is a mutable holder (like `authSnapshot`) exposing `refresh`/`signOut` that delegate to functions registered by `AuthProvider`. `AuthProvider`: `signOut` now passes the stored refresh token to `repos.auth.logout`; `establishSession` unchanged; add a registered `refresh` that reads `tokenStore`, calls `repos.auth.refresh`, on success `tokenStore.save` + `authSnapshot.set` + returns true, on failure returns false. `AppProviders` wires `onRefresh: () => authBridge.refresh()`, `onAuthLost: () => authBridge.signOut()`.
- [ ] **Step 4: Run, pass; `tsc` clean.**
- [ ] **Step 5: Commit.**

### Task 2.4: OTP UI — drop dev-code/destination reliance

**Files:**

- Modify: `src/screens/LoginScreen.tsx` (and any OTP component referencing `devCode`)
- Modify: `src/features/auth/*` OTP hooks if they surface `devCode`

- [ ] **Step 1:** `grep -rn "devCode\|dev_code\|destination" src` and remove autofill/“code sent to …” reliance on fields the backend no longer returns (keep `destination` masked display, drop `devCode`).
- [ ] **Step 2:** `tsc` clean; manual reasoning only (UI). Commit — `git commit -am "feat(auth): OTP UI no longer depends on dev code"`

---

## Phase 3 — Per-module zod schemas + mapper alignment

**Procedure for every module task (TDD):**

1. Create `src/data/http/<module>.schema.ts` with a zod schema for each DTO using the snake_case fields below; export `z.infer` types.
2. Write `src/data/http/__tests__/<module>.schema.test.ts`: `schema.parse(sampleWire)` then `toDomain(parsed)` and assert the domain object. Run → fail.
3. Update `mappers.ts` (or move mapping into the schema file) to consume the inferred type and apply the field/default rules. Re-point the repo to `schema.parse(...)` the raw `data`.
4. Update the repo (`<module>.repo.ts`) so list methods return `Page<T>` via `http.getList`, singles via `http.get`/unwrap, writes via `http.post/patch/put`.
5. Run → pass; `tsc` clean; commit.

Exact wire→domain maps (fields not listed map 1:1 snake→camel; **bold** = needs a rule):

### Task 3.1: classes

`ClassResponse{ id, tenant_id, name, grade, section, subject, room, student_count, class_teacher_id }` → `Class{ id, name, section, subject, studentCount←student_count, room, nextPeriod←**undefined (no source)** }`. `list()` → `http.getList` → `Page<Class>` (nextCursor null). `get(id)` → unwrap. Endpoint `/classes`, `/classes/{id}`.

### Task 3.2: students (roster)

`StudentResponse{ id, admission_no, name, gender, grade, section, class_label, roll(int), guardian_name, guardian_phone, attendance_pct(decimal), fee_status, fee_due, status, house, avatar_hue, dob, email, address }` → `Student{ id, name, roll←**String(roll)**, initials←**derive from name**, classId←**path param (inject in repo)**, attendance←attendance_pct, grade, parent←guardian_name, parentPhone←guardian_phone }`. `listByClass(classId, { limit?, cursor? })` → `http.getList('/classes/'+classId+'/students', { params:{ limit, cursor } })` → `Page<Student>` (map injecting `classId`). `get(id)` → `/students/{id}` unwrap.

### Task 3.3: subjects

`SubjectResponse{ id, tenant_id, name, short, teacher_id, color }`. App has no `Subject` domain type yet — **add** `interface Subject { id; name; short?; color? }` to domain + `SubjectsRepository.list(): Promise<Page<Subject>>` + register in `types.ts`/`factory.ts` only if a screen needs it; otherwise skip wiring (YAGNI) and just align if already referenced. (Check `grep -rn "subjects" src/features src/screens`; if unused, **omit this task**.)

### Task 3.4: timetable

`TimetableSlotResponse{ id, day, period, subject, class_id, class_name, room, start_time, end_time }` → `TimetableSlot{ ... className←class_name, classId←class_id, startTime, endTime }`. `day` is a string; keep as `WeekDay` (validate it's one of Mon–Fri; default passthrough). `/timetable` → `getList` → `Page<TimetableSlot>`.

### Task 3.5: assignments

`AssignmentResponse{ id, title, class_id, class_name, subject, due_date, submissions_count, total_students, status, description, image_uri }` → `Assignment{ ... className←class_name, dueDate←**date(due_date)**, submissionsCount, totalStudents, imageUri }`. Create posts `CreateAssignmentRequest{ title, class_id, class_name?, subject?, due_date?, description?, image_uri? }` from `NewAssignmentInput`. `/assignments`.

### Task 3.6: announcements

`AnnouncementResponse{ id, title, body, date, from, role, type, pinned, audience }` → `Announcement{ ... date←**date(date)**, from, type, pinned }`. Create posts `{ title, body, type?, audience? }`. `/announcements`.

### Task 3.7: calendar

`CalendarEventResponse{ id, title, date, time, type, description }` → `CalendarEvent{ ... date←**date(date)** }`. `/calendar`.

### Task 3.8: library

`LibraryBookResponse{ id, title, author, subject, issued_to, due_date, status }` → `LibraryBook{ ... issuedTo←issued_to, dueDate←**date(due_date)** }`. `/library`.

### Task 3.9: payroll

`PayslipResponse{ id, tenant_id, user_id, month, year, gross, deductions, net, status }` → `PayslipEntry{ id, month, year, gross, deductions, net, status }`. `/payslips`.

### Task 3.10: dashboard

`DashboardStatsResponse{ total_students, total_classes, attendance_today, pending_assignments, upcoming_exams }` → `DashboardStats` (existing mapper correct). `/dashboard/stats` unwrap single.

### Task 3.11: exams (→ exam-papers)

`ExamPaperResponse{ id, exam_id, class_id, name, subject, subject_id, date, start_time, duration_min, max_marks, room, invigilator1, invigilator2, status }` → `Exam{ id, title←name, classId←class_id, className←**'' (no source)**, subject, date←**date(date)**, time←start_time, duration←duration_min, maxMarks←max_marks, topics←**[] (no source)**, status }`. Create/update map via `CreateExamPaperRequest`/`UpdateExamPaperRequest` (drop `topics`/`className` — no wire field). List `/exam-papers` (DataEnvelope list) → `Page<Exam>`. `get`/`remove`/`update` on `/exam-papers/{id}`.

### Task 3.12: grades

`GradeResponse{ id, student_id, student_name, exam_paper_id, marks, max_marks, grade, gpa, pass, date }` → `GradeEntry{ studentId, studentName, examId←exam_paper_id, marks, maxMarks←max_marks, grade }`. `listByExam(examId)` → `/exam-papers/{examId}/grades` (DataEnvelope list) → `Page<GradeEntry>`. `upsert` → PUT `/grades` `{ student_id, student_name?, exam_paper_id, marks }`.

### Task 3.13: attendance (roll-call)

GET `/classes/{classId}/attendance?date=YYYY-MM-DD` → `AttendanceRecordResponse{ id, tenant_id, class_id, student_id, date, status }` → `AttendanceRecord{ studentId←student_id, status←**word→code via ATT map**, date←date(date) }`. Save POST `/classes/{classId}/attendance` body `{ date, records:[{ student_id, status←**code→word**}] }` → 204. Confirm backend `status` word set is `present|absent|late|leave`; reuse the existing `ATT_WORD_TO_CODE`/`ATT_CODE_TO_WORD` in `mappers.ts`.

### Task 3.14: chat (threads)

Contacts: `ChatThreadResponse{ id, name, role, last_message, last_at, unread, group, child_id }` → `ChatContact{ id, name, role, initials←**derive from name**, lastMessage←last_message, time←last_at, unread, online←**false** }`. Messages: `ChatMessageResponse{ id, thread_id, sender_id, text, sent_at, is_mine }` → `ChatMessage{ id, senderId←sender_id, text, time←sent_at, isMe←is_mine }`. `contacts()` → `/threads`; `messages(id)` → `/threads/{id}/messages`; `send(id, text)` → POST `/threads/{id}/messages` `{ text }`.

### Task 3.15: leave

`LeaveResponse{ id, requester_id, child_id, type, from_date, to_date, reason, substitute, status, applied_on, decided_note }` → `LeaveRequest{ id, type←**cast to LeaveType, unknown→'other'**, from←from_date, to←to_date, reason, substitute, status, appliedOn←**date(applied_on)** }`. `list()` → `/leave`; `create()` → POST `/leave` `{ type, from_date, to_date, reason, substitute?, child_id? }`.

### Task 3.16: approvals

GET `/approvals?status=pending` → `LeaveResponse[]` → `ApprovalRequest{ id, type←'leave', requesterId←requester_id, requesterName←**'Staff member'**, requesterInitials←**'—'**, title←**`${type} · ${days}d`**, detail←**reason ?? ''**, from←from_date, to←to_date, reason, substitute, priority←**'medium'**, status, appliedOn←date(applied_on), decidedNote←decided_note }`. `decide(id, decision, note)` → PATCH `/approvals/{id}` `{ status: decision, decided_note: note }`. (Document the synthesized fields as known limitations.)

### Task 3.17: principal

Overview `/principal/overview` and attendance `/principal/attendance` — existing `toPrincipalOverview`/`toSchoolAttendance` mappers already match backend field names (`kpis`, `staff[]`, `classes[]`). Wrap responses with `unwrapData`; add zod schemas to validate; keep mappers.

### Task 3.18: bus

`BusResponse{ id, bus_no, route_name, driver, driver_phone, stops:[{ id, name, time, seq, lat, lng }] }` → `Bus{ id, number←bus_no, routeName←route_name, driver, driverPhone←driver_phone, stops:[{ id, name, time, order←seq, lat, lng }] }`. Roster `/bus/{id}/roster` → `BusRosterEntry{ student_id, student_name, initials, stop_id, status }` → `BoardingRecord{ studentId, studentName, initials, stopId, status }`. Position `/bus/{id}/position` → `BusPosition` (snake→camel). Boarding POST `/bus/{id}/boarding` `{ records:[{ student_id, stop_id, status, at? }] }`. `assignedBus()` → `/bus/assigned`.

### Task 3.19: myAttendance

`/me/attendance/school-location` (GET/PUT), `/me/attendance/punch` (POST), `/me/attendance/today` (GET), `/me/attendance/history?limit` (GET list), `/me/attendance/summary?month` (GET). Map `SchoolLocationResponse{ lat, lng, radius_meters, name }`→`SchoolLocation{ ..., radiusMeters }`; `TeacherAttendanceDayResponse{ date, check_in, check_out }`→`{ date:date(date), checkIn, checkOut }` with `CheckEventResponse` snake→camel (`accuracy_meters`, `distance_meters`); `TeacherAttendanceSummaryResponse{ days_present, days_flagged, total_hours }`→camel. Punch posts `{ kind, at, lat, lng, accuracy_meters }`. `history` returns `Page<TeacherAttendanceDay>` (or keep array — see Task 4 note).

> Add a shared `dateOnly(iso: string): string` helper in `mappers.ts` for the `date(...)` rule (slice `YYYY-MM-DD`).

---

## Phase 4 — Pagination / list UI

### Task 4.1: types.ts + queryClient — Page shapes & roster keys

**Files:** Modify `src/data/repositories/types.ts`, `src/lib/queryClient.ts`.

- [ ] Change every list repo return type to `Page<T>` (import `Page`); `students.listByClass(classId: string, page?: { limit?: number; cursor?: string }): Promise<Page<Student>>`.
- [ ] Add `studentsByClassPage` infinite key if needed; keep existing keys.
- [ ] `tsc` will flag every hook — fixed in 4.2. Commit after hooks compile.

### Task 4.2: list hooks adapt to Page<T>

**Files:** Modify each `src/features/*/hooks.ts`.

- [ ] For non-roster lists: hook stays `useQuery` but `select`/maps `(page) => page.items`, so screens keep receiving arrays. (Minimal churn; cursor-ready repo, simple hook.)
- [ ] For roster (`useStudentsByClass`): convert to `useInfiniteQuery({ queryKey, queryFn: ({pageParam}) => repos.students.listByClass(classId, { cursor: pageParam }), initialPageParam: undefined, getNextPageParam: (last) => last.nextCursor ?? undefined })`; expose `students = data.pages.flatMap(p => p.items)`, `fetchNextPage`, `hasNextPage`.
- [ ] Test the roster hook’s pageParam flow with a fake repo returning two pages. Commit.

### Task 4.3: ClassDetailScreen infinite scroll + FlatList conversions

**Files:** Modify `src/screens/ClassDetailScreen.tsx` (+ other list screens to `FlatList` for consistency, no infinite scroll).

- [ ] `ClassDetailScreen`: `FlatList` of students, `onEndReached={() => hasNextPage && fetchNextPage()}`, footer `ActivityIndicator` while `isFetchingNextPage`.
- [ ] Convert remaining ScrollView+.map list screens (Classes, Announcements, Assignments, Exams, Library, Leave history, Approvals, Payslip, Bus roster, Grades, MyAttendance history) to `FlatList` rendering the single page array. Preserve existing item rendering/empty states.
- [ ] `tsc` clean; commit per screen or in a small batch.

---

## Phase 5 — Verification & cleanup

### Task 5.1: Live smoke script

**Files:** Create `scripts/smoke/teacher-smoke.ts`; add `"smoke:teacher"` script to `package.json`.

- [ ] Script reads `API_BASE_URL` + a seeded teacher OTP/login from env, logs in, then GETs each teacher endpoint and asserts the envelope + 1–2 key fields per module; prints a pass/fail table; exits non-zero on any failure. Document: requires `docker-compose up` in `sms-backend`.
- [ ] Commit.

### Task 5.2: Full typecheck, lint, test sweep

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npx eslint .` → clean.
- [ ] `npx jest` → green (schema/mapper/httpClient/auth tests).
- [ ] `grep -rn "DATA_SOURCE\|createMockRepositories\|data/mock" src` → no results.
- [ ] Commit any fixes.

---

## Self-Review (completed by author)

- **Spec coverage:** §1 architecture→Task 0.3; §2 httpClient→0.1–0.2; §3 auth→2.1–2.4; §4 backend `/me`→1.1; §5 modules→3.1–3.19; §6 pagination→4.x; §7 verification→5.1–5.2; §8 consequences→2.4/0.3. Covered.
- **Placeholders:** field maps are concrete; defaults specified in Global Constraints + per task.
- **Type consistency:** `Page<T>`, `unwrapData`/`unwrapList`, `onRefresh: () => Promise<boolean>`, `authBridge.refresh/signOut`, `AuthRepository.refresh → {accessToken,refreshToken}`, `logout(refreshToken)` used consistently across tasks.
- **Open at execution:** confirm backend roll-call status word set (Task 3.13) and whether `subjects` is consumed (Task 3.3) by grepping before wiring.
