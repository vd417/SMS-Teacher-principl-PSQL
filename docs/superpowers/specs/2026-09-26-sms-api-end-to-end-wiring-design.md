# Teacher App ↔ sms-api (PostgreSQL) End-to-End Wiring — Design

- **Date:** 2026-09-26
- **Status:** Draft, awaiting user review
- **Repos:** `sms-teacher-app` (this repo), `sms-api` (`D:\convert\SMS backend\sms-api`)
- **Scope option chosen:** 2. Repoint and verify the app, and fix the backend where it is wrong or missing things the app already needs.

## 1. Goal

Move the teacher app off the legacy `sms-backend` (SQL Server) and onto `sms-api` (.NET 10 + PostgreSQL 18 with RLS). Every teacher and principal flow the app ships must be proven correct against real PostgreSQL data, real authentication and real SignalR.

"Correct" means more than HTTP 200. The route, method, authorization, request fields, response fields and actual values must all match. Responses must also parse with the app's real zod schemas.

### Current state (verified 2026-09-26)

- The app already talks to a live API. There is no mock layer. It makes about 70 calls across `src/data/http/*.repo.ts`, and the base URL comes from `EXPO_PUBLIC_API_BASE_URL`, which includes `/v1`.
- `sms-api` exposes the same contract family:
  - hard-coded `v1/...` routes
  - `{data}` / `{data, next_cursor}` envelopes
  - errors as `{error:{code,message,details?}}`
  - snake_case JSON
  - an HS256 JWT (15 min) plus an opaque rotating refresh token (30 days)
  - a `tenant_id` claim plus an optional `X-Tenant-Id` header, enforced through Postgres RLS
  - hubs `/hubs/live` and `/hubs/transport-fleet`
- `docs/api/teacher-api.md` in `sms-api` is stale; for example, login returns tokens only. It is **not** authoritative. The source of truth is described in §5.

### Repositories and baseline

| Repo | Path | Branch | Commit at spec time | Remote | Changed by this work |
|---|---|---|---|---|---|
| `sms-teacher-app` | `D:\convert\SMS backend\sms-teacher-app` | `main` | `b9da198` (+ spec commits) | `vd417/SMS-Teacher-principl-PSQL` | yes |
| `sms-api` | `D:\convert\SMS backend\sms-api` | `postgres-migration` (PostgreSQL) | `34af78e` | `vd417/SMS-PSQL` | yes |

- No other repo is changed. That includes `sms-backend` (the old SQL Server path), `sms-admin`, `sms-staff`, `sms-student-parent-app` and `sms-catreadmin`.
- All backend work targets `sms-api` on `postgres-migration`. Nothing targets the SQL Server path.
- When implementation starts, record the branch, `HEAD` commit and clean/dirty state of both repos in the parity-matrix doc header. If a repo is dirty or its branch has moved, stop and ask before proceeding.

### No behaviour regression

- Existing teacher-app functionality must keep working.
- Do not rewrite navigation, authentication, offline/NetInfo behaviour, the session and tenant handling, or existing UI unless a matrix row requires it for the wiring.
- Do not remove backend endpoints merely because the teacher app stops calling them. Other apps may depend on them.

### Non-goals

- Wiring backend endpoints the app does not use today (scope option 3), for example `me/settings`, leave balances and achievements.
- PTM. It exists in `sms-api` only as an announcement prefix and is not a teacher-app requirement. It is out of scope unless an existing teacher-app requirement turns up later.
- Generating a typed client from OpenAPI.
- Changing the `preview` and `production` URLs in `eas.json`. That is a deployment decision.

## 2. Constraints (user-mandated)

1. Never read, print, log or expose passwords, connection strings, user-secrets or `pgpass.conf`. Reuse them only through their normal mechanisms: `dotnet run` user-secrets, Npgsql pgpass lookup, and the `SMS_MIGRATOR_CONNECTION` env var set by the user.
2. Never run `init` against `sms_dev`, and never reset, drop, truncate, update, delete or overwrite non-seed data.
3. `Sms.PgMigrator status` is read-only and allowed. `migrate` stays approval-gated: if `status` shows pending migrations, list them and wait for approval. The same gate applies to applying any new migration this work adds.
4. The dev seed is strictly isolated to one dedicated seed tenant with deterministic seed users and data, and it is genuinely idempotent.
5. Do not invent endpoints to satisfy the matrix. If a genuinely required endpoint is missing, stop and raise it as a separate scope decision.
6. Do not loosen zod schemas to accept bad API responses. A wrong shape is a contract defect and gets fixed at the correct layer.
7. Do not fix anything only because it appears in Swagger or in the old 2026-07-24 gap list.
8. The completed parity matrix must be reviewed and approved **before any app or backend fix is implemented**.
9. Keep the `lan-apk` configuration untouched unless E2E wiring actually requires a change.
10. All commits stay local and unpushed until the user explicitly approves the final commits.
11. **Nothing is built before the plan is approved.** After this spec is approved, produce only the implementation plan. Do not modify application code, migrations, tests, seed data or configuration until the user separately approves the plan.
12. The 2026-07-24 gaps are **evidence to re-check, not requirements**. Each one is first verified against the current `sms-api` code and real HTTP behaviour. Only a gap that still exists and affects a shipped app feature can become a fix.

## 3. Local environment (no Docker)

- **Postgres:** the existing Windows service `postgresql-x64-18`, database `sms_dev`.
  1. Run `Sms.PgMigrator status` against `sms_dev` using the owner connection from `SMS_MIGRATOR_CONNECTION`.
  2. If migrations are pending, report them and stop for approval.
- **API:** run `dotnet run --project src/Sms.Api` in Development on `http://0.0.0.0:5162`.
  - The connection string comes from the existing user-secrets (`UserSecretsId 94866f7e-…`).
  - Verify health with `GET /health/ready`, not `/health`.
  - CORS already allows the Expo ports.
- **App:** a gitignored `.env` sets `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:5162/v1`. Use `http://10.0.2.2:5162/v1` for the Android emulator.
  - The existing `lan-apk` profile already targets an http `:5162` URL.
  - `app.config.js` already enables cleartext for http URLs.

## 4. Dev seed: `sms-api/tools/Sms.DevSeed`

A C# console project added to `Sms.slnx`.

- **Password hashing:** it hashes passwords with the real `Sms.Shared.Kernel` `PasswordHasher`, so seeded users log in through the real `/v1/auth/login`. The chain is: real hash → `/auth/login` → JWT → authorized API → PostgreSQL.
- **Connection:** it uses the owner connection from `SMS_MIGRATOR_CONNECTION`, or pgpass via Npgsql, and never reads either directly.
- **Guards (mandatory):**
  - it refuses unless the target database name ends in `_dev`
  - it refuses unless `--i-know-this-is-dev` is passed
- **Isolation:**
  - One seed tenant, "SchoolDesk Dev Seed", with a fixed tenant GUID.
  - Every seeded row belongs to that tenant or to seed users.
  - Seed users use emails `@seed.schooldesk.test`.
  - The tool never issues UPDATE, DELETE or TRUNCATE.
- **Idempotency:**
  - Every row uses a deterministic GUID and is written with `INSERT … ON CONFLICT DO NOTHING`.
  - Before relying on each `ON CONFLICT`, verify the real primary and unique constraints in `db/postgres/04_tables.sql`, `05_constraints.sql` and the migrations.
  - The tool prints inserted/skipped counts per table.
  - **Acceptance:** running `Sms.DevSeed` twice against the same `_dev` database produces zero additional business rows and does not alter any existing seeded IDs or data. Verify this by comparing per-table row counts and a checksum of the seed-tenant rows before and after the second run.
- **Schema verification:** every seed table and column is checked against the real PostgreSQL schema before implementation. Where the domain has a proc, prefer calling it, for example the tenancy and auth procs in `09_auth_procs.sql` and `10_tenancy_procs.sql`.
- **Contents:**
  - Plan tier platinum, so no screen is hidden by plan tier.
  - Users:
    - 1 principal (`school.principal`)
    - teacher A (`school.teacher`), class teacher of class 1
    - teacher B (`school.teacher`), subject teacher only, who must be refused roll-call (`403 not_roll_call_teacher`)
  - 2 classes with sections, about 10 students each, and subjects.
  - A weekly timetable that covers every weekday, so "today" always has periods.
  - 1 exam with papers assigned to the teachers.
  - 1 pending leave request from teacher B.
  - 1 announcement.
  - The school geofence location.
  - 1 bus with a route, stops, teacher A assigned and roster students.
  - A second, minimal "Dev Seed Other School" tenant, used only for cross-tenant negative checks.
- **Credentials:** fixed dev passwords are documented in `tools/Sms.DevSeed/README.md`. They are test fixtures, not secrets.

## 5. Parity matrix

- **Location:** `docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md` in this repo. It replaces `2026-07-24-live-data-findings.md`.
- **One row per app repo call**, with a stable ID such as `ATT-03`, and these columns:
  - App call: repo method, HTTP method + path, query/body fields sent.
  - Zod schema: its name, fields, types and optionality.
  - Backend route: controller `file:line`, `[Http*]` and route template.
  - Authorization: policy or attribute, and the **expected** status for teacher and for principal (200/403/…).
  - Request DTO: fields as serialized.
  - Response DTO: fields and types, traced through service → DAO → SQL proc.
  - Live check: status and zod parse result for each role, and the value compared with the known seed data.
  - Category.
  - Fix owner: app, backend or none.
- **Categories** (a row can have more than one):
  - ✅ **match**
  - ⛔ **missing**: the route or field does not exist
  - 🔀 **mismatched**: the method, name, type, optionality, pagination or envelope differs
  - ⚠️ **incorrect data**: the contract matches but the value is wrong, e.g. always 0 or null, the wrong tenant, or empty because of the query
  - 🔒 **auth mismatch**
  - 💤 **not-used**: kept in a separate table of teacher-audience routes the app never calls; informational only.
- **Source of truth, in this order:** controller → authorization policy → DTO → SQL proc/schema → actual HTTP response → the app's zod schema. The old `teacher-api.md` is never authoritative. Every mismatch is documented in the matrix before it is fixed.
- **Method:**
  1. **Static:** read the controller attribute, then the policy, then the DTO, then the SQL proc.
  2. **Live:** a capture script calls each route as teacher A, teacher B and principal against the seeded API. It saves raw JSON **redacted of tokens, passwords, cookies and any credentials**, and parses it with the app's real zod schemas. Captures only touch seed-tenant data and keep RLS in place.
  3. **Old gaps:** each of the 32 backend gaps from 2026-07-24 is re-checked and marked **fixed**, **still present**, **not applicable** or **blocked by missing product requirement**, with a link to its row.
- **Fix rules:**
  - Fix the backend for incorrect data, auth mismatches, or a missing field the app already renders, after verifying against the code.
  - Fix the app when `sms-api`'s correct contract differs from what the app does, e.g. PUT versus PATCH on `exam-papers/{id}`.
  - When a route is missing: if the feature needs it, raise it with the user as a scope decision; if not, the app stops calling it.
- **Checkpoint:** the completed matrix is presented to the user for approval before any fix.

## 6. Fixes and testing

- Each fix references its matrix row ID in its test name and commit message.
- **Backend (`sms-api`):**
  - Tests are written first.
  - HTTP and authorization behaviour: integration tests in `tests/Sms.Tests.Integration/<Module>/` using `WebApplicationFactory` against disposable `sms_test_*` databases as `sms_app`, with RLS active.
  - Pure logic: unit tests in `Sms.Tests.Unit`.
  - Required assertions:
    - incorrect-data rows assert the exact corrected value
    - auth rows assert both the allowed and the denied role
    - rows touching tenant data include a cross-tenant check
  - Fixes go in the layer that is actually wrong (proc, DAO, service or DTO).
  - SQL changes ship as new numbered migrations (`db/postgres/migrations/0005_…` onward) and never as edits to the baseline files.
  - **Migration safety:**
    - Already-applied migrations (`0001`–`0004`) and the baseline are never modified.
    - Each new migration must work on a clean database (`init`, which is what the integration fixture runs) **and** upgrade an existing development database (`migrate` on a disposable copy that sits at `0004`).
    - Numbering and ordering are verified with `Sms.PgMigrator status` before the work counts as complete.
    - Applying to `sms_dev` stays approval-gated (constraint 3).
  - Changes are additive only: never rename or remove fields, because `sms-admin`, `sms-staff` and `sms-student-parent-app` share these endpoints. A fix that would break another client is raised with the user.
  - Gate: `dotnet test` passes before each commit.
- **App (`sms-teacher-app`):**
  - Tests are written first in jest. Repo tests use fixtures taken from the redacted live capture.
  - A zod schema changes only when `sms-api`'s correct contract really differs, and the matrix row records why.
  - No unrelated refactors.
  - Gate: `npm test`, `tsc --noEmit` and lint pass before each commit.
- **Commits:** small commits, one per row or per closely related group. All local and unpushed.

## 7. End-to-end gate: `npm run e2e:sms-api`

- **Form:** a jest suite `e2e/sms-api/*.e2e.test.ts` with its own `jest.e2e.config.js`, excluded from `npm test`.
  - It imports the app's real `createHttpRepositories`, `httpClient`, envelope, refresh lock and zod schemas.
  - It does not apply the SignalR jest mock.
- **Prerequisites:**
  - the API is running on `:5162` against the seeded `sms_dev`
  - `E2E_API_BASE_URL` is set
  - seed fixture credentials come from the seed README values
- **Flows covered:**
  1. **Auth:**
     - login → `/auth/me` roles and tenant
     - refresh rotation, where the old refresh token is rejected
     - `/me/schools` and switch-school
     - logout
     - wrong password → `invalid_credentials`
  2. **Teacher reads:** every GET repo call as teacher A. Each response passes zod **and** matches the known seed values.
  3. **Teacher writes, each followed by an API read-back:**
     - class and period attendance
     - grades and notify-marks
     - assignment and homework
     - leave
     - geofenced punch
     - chat message
     - bus boarding
  4. **Tenant and role checks, all through the real HTTP API and never by querying the database directly, with explicit expected statuses from the matrix:**
     - Teacher A can read their own school's classes, students, timetable and attendance.
     - Teacher A cannot reach School B ("Dev Seed Other School"):
       - requesting a School B class or student by ID returns the matrix's expected status (404 or 403)
       - School B rows never appear in any list
       - a mismatched `X-Tenant-Id` returns `403`
     - Teacher B roll-call → `403 not_roll_call_teacher`.
     - A teacher calling `/principal/*` or `/transport/*` → `403`, and the principal → `200`.
  5. **Principal:**
     - overview, student and staff attendance plus history
     - approve teacher B's leave, after which teacher B sees it approved
     - fleet and buses, assigning and unassigning the bus teacher
     - route geometry
  6. **Realtime.** The verified flow is: action through the app's HTTP layer → `sms-api` → SignalR hub → an authenticated client receives the expected event. It uses the real hub URL derived by the app's own `liveEvents` and `transportHub` code, with a real JWT passed as `access_token`. Each check waits at most 10 s, and a timeout is a failure.
     - `/hubs/live`:
       - The principal client is connected.
       - Teacher A posts class attendance.
       - The principal receives `live_event` with `type:"attendance"`.
       - The principal posts an announcement, and teacher A's client receives `live_event` with `type:"announcement"`.
       - A School B client receives neither event.
     - `/hubs/transport-fleet`:
       - The principal connects and `JoinBus(seedBus)` returns `true`.
       - A trip start and ping on the seed bus through `/v1/transport/*` delivers `position_update` for that bus to the principal.
- **Hard requirement.** `npm run e2e:sms-api` must pass from a clean environment: a freshly seeded `_dev` database and a freshly started API. It must run with **no SKIP, no mocked API, no mocked SignalR and no test-only endpoint**.
- **Rules:**
  - Every step asserts an explicit expected status, and there is no SKIP.
  - A pre-flight check calls `GET /health/ready` and fails the whole run (non-zero exit) if `sms-api` is unreachable or not ready. An unavailable backend can never produce a green result.
  - The suite is repeatable on the same seeded database, using run-scoped or idempotent writes.
  - It only touches seed-tenant data.
  - It never logs tokens or passwords.
- `scripts/smoke/teacher-smoke.mjs` is removed once the gate replaces it, and the README gains a "running against sms-api locally" section.

## 8. Definition of done

1. The parity matrix is complete and approved.
2. Every row is ✅, fixed, or explicitly deferred with the user's sign-off.
3. `dotnet test` passes in `sms-api`.
4. `npm test`, `tsc --noEmit` and lint pass in the app.
5. `npm run e2e:sms-api` passes twice in a row on the seeded `sms_dev`, from a clean start, with no SKIP or mocks.
6. New migrations are verified on a clean database and as an upgrade from `0004`, and their ordering is confirmed.
7. There are no behaviour regressions in existing teacher-app features.
8. A manual check succeeds: the LAN APK or Expo Go logs in as the teacher and as the principal against the local API.
9. All commits stay local until the user approves them.

## 9. Risks

- **Pending migrations on `sms_dev`:** blocked on user approval (constraint 3).
- **Backend fixes to shared endpoints could affect other apps:** mitigated by additive-only changes and the full `dotnet test` suite.
- **Seed/schema drift:** the seed is verified against the actual schema, and its second run must insert zero rows.
- **Owner-connection availability:** if neither `SMS_MIGRATOR_CONNECTION` nor pgpass provides an owner login, stop and ask the user to set it. Never read the secrets.
