# Live API End-to-End — Delete Mocks, Align All Modules

**Date:** 2026-06-22
**Branch:** `field-alignment-canonical`
**Status:** Approved (design) — pending implementation plan

## Goal

Make the Teacher App run against the **real backend** (`sms-backend`, `/swagger/teacher/swagger.json`)
end-to-end, at production quality, and **remove the mock data layer entirely**. After this work the app
has a single runtime data path (live HTTP), correct field alignment with the backend's wire contracts,
hardened transport (auth refresh, envelope unwrapping, pagination), and a verification strategy that
replaces the deleted mock↔http contract tests.

## Decisions (locked)

1. **Delete the mock layer entirely** — live is the only runtime path; the contract tests go too.
2. **Run the backend locally** (`docker-compose`) as the source of truth for every contract.
3. **Align all ~20 modules in one pass**, then the app is live by construction.
4. **Extend backend `/v1/auth/me`** to return the teacher's display profile (truest end-to-end).
5. **Full infinite-scroll cursor pagination** threaded through repos _and_ list UI.
6. **Zod response-parsing at the repo boundary** is the DTO source of truth and the replacement
   for the deleted contract tests.

## Backend contract facts (verified against `sms-backend`)

- JSON is **snake_case** (`SnakeCaseNamingPolicy` in `Program.cs`) — matches existing app DTOs. Good.
- **Every response is enveloped** (`src/Sms.Shared.Kernel/Http/ErrorEnvelope.cs`):
  - Single resource: `DataEnvelope<T>` → `{ "data": T }`
  - List: `CursorPage<T>` → `{ "data": T[], "next_cursor": string|null }`
  - Error: `ErrorEnvelope` → `{ "error": { "code": string, "message": string, "details": {field: string[]}|null } }`
- **Pagination** (`Paging.cs`): query `limit` (1–200, default 50) + `cursor`; response `next_cursor`.
- All routes are under **`/v1`**; auth under `/v1/auth` (`AuthEndpoints.cs`).
- **Auth returns tokens only**: `login`, `otp/verify` → `DataEnvelope<TokenResponse>` =
  `{ data: { access_token, refresh_token } }`. No user, no tenant.
- `otp/request` → `{ data: { sent: true } }` (no `destination`/`dev_code`).
- `GET /v1/auth/me` currently → `{ data: { id, tenant_id, roles: string[] } }` only.
- **No teacher self-profile endpoint exists** — hence decision #4.
- Teacher API surface is fixed by `Sms.Api/Swagger/ApiAudienceMap.cs` (the `Teacher` audience);
  note `/v1/teachers` is **not** in the teacher audience, so the app cannot use it for its own profile.

## Current app state

- Full **mock + http** repository architecture behind `RepositoryContext`/`factory.ts`, switched by
  `EXPO_PUBLIC_DATA_SOURCE` (`config/env.ts`).
- HTTP repos + `mappers.ts` exist for all modules but assume **raw (un-enveloped) responses**, **no `/v1`
  prefix**, and a **full `SessionDTO`** from login. All three assumptions are wrong.
- `httpClient.ts` reads `j.message` on error (wrong key), has **no 401 refresh-retry**, **no envelope
  unwrap**, **no pagination**.
- `zod` is already a dependency (used in `src/validation`).

---

## Design

### 1. Target architecture — live-only

- Delete `src/data/mock/**` (all repos, `seed.ts`, `store.ts`).
- Delete `src/data/http/__tests__/*.canonical.test.ts` (mock↔http contract tests).
- `factory.ts`: remove `createMockRepositories`; keep only `createHttpRepositories`.
- `RepositoryContext.tsx`: always construct HTTP repos against the live `httpClient`.
- `config/env.ts`: remove `DATA_SOURCE`; keep `API_BASE_URL` (now includes `/v1`) and
  `GOOGLE_MAPS_API_KEY`.
- Any code branching on `env.DATA_SOURCE` is removed.

### 2. httpClient hardening (the spine)

`src/lib/httpClient.ts` becomes the single place that understands the wire envelope:

- **Unwrap on success**: a typed `get`/`getList`/`post`/… that returns `data` for single resources and
  `{ items, nextCursor }` for list endpoints. Repos never see the envelope.
- **Error envelope**: parse `{ error: { code, message, details } }` → `AppError({ code, status, message, details })`.
  Field-level `details` are surfaced to forms.
- **401 → refresh once & retry**: on a 401 (other than the refresh call itself), call `/v1/auth/refresh`
  with the stored refresh token, **single-flight** (concurrent 401s await one refresh), persist the rotated
  refresh token, retry the original request once. On refresh failure → clear session / sign out.
- **Headers**: `Authorization: Bearer <access>` and `X-Tenant-Id` from the auth snapshot (existing
  `authSnapshot`/`tokenStore`).
- Keep network/timeout → `AppError({ code: 'network' })`.

### 3. Auth & session reshape

- `httpAuth`:
  - `login(email, password)` and `verifyOtp(identifier, code)` → store `{ access, refresh }`, then
    `GET /v1/auth/me` to build `Session` (`User` + `Tenant`).
  - `requestOtp(identifier)` → expects `{ sent: true }`; OTP UI no longer reads `destination`/`dev_code`.
  - `refresh`, `setPassword`, `logout` aligned to real shapes (`refresh`/`logout` take `{ refresh_token }`).
  - `me()` maps the **extended** `/auth/me` (see §4) into `User` + `Tenant`.
- **Role mapping**: `roles: string[]` → single `Role` by precedence `principal` > `teacher`.
- Remove the `SessionDTO` shape that assumed login returns user+tenant; `toSession` is rebuilt from
  tokens + `/auth/me`.
- OTP-only login UI (current) is unaffected functionally; demo/dev-code affordances are removed.

### 4. Backend change — extend `/v1/auth/me`

In `sms-backend` `AuthEndpoints.MapAuth` (the `/me` handler), additively return the display profile:

```
GET /v1/auth/me ->
  { data: { id, tenant_id, roles,
            name, title, email, phone, employee, classroom, joined, tenant_name } }
```

Source `name/title/email/phone/...` from the user/teacher record and `tenant_name` from the tenant,
using the authenticated `sub`/`tenant_id`. Update the backend's auth tests to assert the new fields.
Change is additive and isolated to the auth slice.

**BLOCKED (discovered during implementation):** the backend has no `Users`↔`Teachers` linkage.
`dbo.Users` (auth) carries only `email`/`phone`; the display profile (`name`, `title`/Designation,
`Department`, etc.) lives in `dbo.Teachers`, which has **no `user_id` foreign key** — the only join key
is a fragile email/phone match. Fields `employee`, `classroom`, and `joined` have no clean column
source at all. Implementing `/auth/me` profile enrichment therefore requires a backend **schema
decision** (add a `Teachers.UserId` FK and map the missing fields), which needs a running SQL Server to
migrate and validate. Rather than ship an unvalidated migration that could break login, this is left as
a backend task. **The app side is complete and degrades gracefully:** `meSchema` treats every profile
field as optional, so live login works today; the Profile/Home screens render blank/`—` for the
unsourced fields until the backend linkage lands.

### 5. Per-module field alignment (one pass)

For each module: boot the backend, fetch real responses, diff each app DTO field against the backend
`…Response` record, and reconcile `mappers.ts` (and domain types only where genuinely needed). Envelope
unwrapping is handled centrally (§2), so per-module work is field names/shapes + list pagination.

Modules: `classes`, `students`, `subjects`, `timetable`, `assignments`, `homework`, `announcements`,
`calendar`, `library`, `payroll`, `dashboard`, `exams`/`exam-papers`, `grades`, `attendance` (roll-call),
`threads`/chat, `leave`, `approvals`, `principal`, `bus`, `myAttendance`.

Each DTO is expressed as a **zod schema** (§7) that doubles as the type and the validator.

### 6. Pagination (cursor-ready repos; real paging only where the backend supports it)

**Backend reality (verified):** only `GET /v1/classes/{classId}/students` (class roster) is truly
cursor-paginated (`limit`+`cursor`→`next_cursor`). `GET /v1/students` returns a `CursorPage` envelope but
always with `next_cursor: null`. **Every other list endpoint returns `DataEnvelope<List<T>>`** — the full
array, no pagination.

Design accordingly:

- **Uniform repo shape:** every list repo method returns `{ items, nextCursor }`. For non-paginated
  endpoints `nextCursor` is always `null` (single page).
- **Class roster** (`students.listByClass`) accepts `{ limit?, cursor? }` and is the one endpoint that
  truly pages. Its hook uses React Query **`useInfiniteQuery`**; `ClassDetailScreen` uses `FlatList` +
  `onEndReached` → `fetchNextPage` with a footer spinner.
- **All other list screens** convert to `FlatList` for consistency and render the single page; their
  `useInfiniteQuery` (or plain `useQuery`) simply never has a next page (`getNextPageParam` returns
  `undefined`).
- Repos stay cursor-shaped so if the backend later adds pagination to an endpoint, only the backend +
  that endpoint's `nextCursor` wiring changes — not the hook or screen.

### 7. Verification — replaces the deleted contract tests

- **Zod at the repo boundary**: one schema per DTO; repos `schema.parse(response)` so drift fails loud and
  typed rather than rendering `undefined`. Schemas are the single source of truth (type via `z.infer`,
  validation, and mapping input).
- **Live smoke script**: a script that assumes a running backend (`docker-compose up`) with a seeded
  teacher account, logs in via OTP/login, and hits every teacher endpoint asserting envelope + key fields.
  Not part of unit CI by default (needs a live API) but runnable on demand and in integration CI.
- **Static checks**: `tsc` (zod-inferred types catch shape drift at compile time) + existing component tests.

### 8. Config & ops

- `EXPO_PUBLIC_API_BASE_URL` → real host **with `/v1`** (e.g. `https://<host>/v1`); document the local
  default for `docker-compose`.
- Remove `EXPO_PUBLIC_DATA_SOURCE`.
- Tokens stay in `expo-secure-store` via existing `tokenStore`.
- Document: "dev requires the backend running (`docker-compose up` in `sms-backend`)."

## Consequences / risks (accepted)

- **One-tap demo logins removed** (mock-backed) — Welcome/Login demo affordances are removed or pointed at
  a real seeded test account.
- **No offline mode** (mock fallback is gone).
- **Dev requires the backend** running locally.
- The auth/session reshape touches the login/OTP flow; OTP UI loses dev-code autofill.

## Out of scope

- Backend modules other than the `/auth/me` extension (they are already implemented).
- Non-teacher audiences (admin/student/staff apps).
- Any new product features beyond making existing screens live.

## Open items to resolve during implementation

- Exact missing/renamed fields per module (discovered by diffing live responses) — reconcile in `mappers.ts`.
- Confirm which list screens warrant infinite scroll vs. naturally-bounded lists (e.g. timetable/day views).
