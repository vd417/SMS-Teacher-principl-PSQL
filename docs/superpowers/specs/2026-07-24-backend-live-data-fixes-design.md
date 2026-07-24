# Backend Fixes for Live-Data Audit Findings (Phase 3)

**Date:** 2026-07-24
**Repo:** sms-backend (D:/SMS/sms-project/sms-backend)
**Status:** Design approved. Implementation plan next.

## Context

The 2026-07-24 live-data audit of `sms-teacher-app` ([[teacher-app-live-api]], `docs/superpowers/audits/2026-07-24-live-data-findings.md`) found 32 backend-gap rows across 11 distinct root causes. This spec covers fixing 10 of those 11 in `sms-backend` — everything except settings/preferences persistence (item #11), which is deferred as a separate future feature (full new table + endpoint + product decision on what's configurable, not a small fix). The app-side wiring to actually _consume_ these new/fixed fields is a separate plan (Phase 2), out of scope here.

This spec covers **sms-backend changes only**: migrations, stored procedures, contracts, endpoints, and tests. No `sms-teacher-app` code changes.

## Goal

Fix the 10 backend gaps so the data they expose is real, not stubbed/hardcoded/absent — without introducing new fragile patterns (e.g. baking stale names into rows at write time when a live join is cleaner; role-agnostic identity resolution instead of assuming every user is a teacher).

## Architecture: Identity-link foundation

Three of the ten gaps (`/auth/me` missing fields, the `/timetable` teacher-filter bug, and `/approvals`+`/announcements` requester naming — 21 of 32 backend-gap rows) share one root cause: there is no reliable link between `dbo.Users` (the auth table, shared across the whole SaaS suite — `sms-admin`, `sms-staff`, `sms-student` likely also call `/auth/me`) and any role-specific directory record (`dbo.Teachers`, `dbo.Staff`). Neither directory table has a `UserId` FK; only loose, non-unique `Email`/`Phone` string columns exist.

**Fix, in order:**

1. **`dbo.Users` gains `Name` (nvarchar, nullable) and `MustSetPassword` (bit, default `0`).** `Users.Name` becomes the single source of truth for identity display everywhere — never `Teachers.Name` or any other directory table. `Email`/`Phone` already exist on `Users`; no schema change needed for those two, `GetMe` simply never projected them.
2. **`dbo.Teachers` and `dbo.Staff` gain a nullable `UserId` FK** to `dbo.Users`, unique index where non-null (enforces 1:1). This is the join path for role-specific profile data and the timetable filter.
3. **Backfill migration:** best-effort match `Teachers`/`Staff` rows to `Users` by `(TenantId, Email)` or `(TenantId, Phone)`. On a clean single match: set the FK, copy the directory name into `Users.Name` if `Users.Name` is currently null. On zero or multiple matches (ambiguous): leave unlinked, emit the row to a migration-time report (log output or a side reporting table) for manual follow-up — do not silently drop or force a guess. Principals have no directory row today; their `Users.Name` stays null until set some other way (out of scope here — the app already degrades gracefully to blank/placeholder for missing identity data, per the audit's item 1 note).
4. **`MustSetPassword`** defaults `false` for all existing rows (nobody currently using the app gets newly gated) and is set `true` only for accounts created after this ships; the existing `SetPassword` success handler flips it back to `false`. This activates the first-time-password gate that `sms-teacher-app`'s `RootNavigator` already built but that's been dormant.

**`/auth/me` becomes role-agnostic.** `AuthService.GetMe` currently reads only JWT claims synchronously with zero DB access (`AuthService.cs:217-229`). It becomes `async`, always sources base identity (`name`, `email`, `phone`, `must_set_password`, `joined` = `Users.CreatedAt`, `tenant_name`) from `Users` via the existing injected `IAuthDao` (extending `UserRecord` with the new `Name`/`MustSetPassword` fields and the underlying `User_GetById` proc), then resolves role-specific profile fields (`title`, `classroom`) through a small role-based dispatch: `teacher` role → join `Teachers` via `UserId`; other staff roles → join `Staff` via `UserId`; `principal` → no profile table exists today, so profile fields stay null while base identity still populates. **No polymorphic "Profiles" table** — `Teachers`/`Staff` (and future `Parents`/`Students` for the sibling apps) stay separate, owned by their own modules; the dispatch is a `switch`/lookup that gains one branch per role as new apps need it, not a restructure.

`classroom` derives via `Classes.ClassTeacherId → Teachers.Id` (no new column). `employee` (employee ID) has no source anywhere in the schema — deferred, stays blank as today rather than inventing an ID scheme as a side effect of this pass. `tenant_name`'s exact source table/column is to be confirmed during implementation (verify the tenants table's name column before writing the join).

## Timetable teacher filter (#2)

`TimetableRepository.ListAsync` has no filter (`TimetableSlots` has no `TeacherId` column). Fix filters by **role**, not universally:

- **Teacher** caller: only slots derivable via `TimetableSlots.ClassId → Classes.ClassTeacherId → Teachers.Id` (through the new `UserId` link) OR `TimetableSlots.Subject` (free-text) matched to `Subjects.Name → Subjects.TeacherId`.
- **Principal** caller: unfiltered whole-school view, unchanged — legitimate for `SchoolTimetableScreen`/`ClassTimetableScreen`.

Known limitation, flagged as a follow-up rather than solved here: the `Subject` match is fragile free-text matching (case/typo mismatches could miss a slot), and a slot with neither a linked class-teacher nor a matching subject-teacher won't appear for anyone. Strictly better than today's full whole-tenant exposure, not a perfect filter.

## Approvals & Announcements requester naming (#3)

- **`LeaveResponse`**: add `RequesterName`, resolved via `RequesterId → Users.Id → Users.Name` **at query time** (join in the `GET /approvals` query) — not baked into the row at request-creation time, so it never goes stale.
- **Announcements**: today `AnnouncementService.CreateAsync` bakes the creator's _role_ string into `Announcements.From` at write time (`AnnouncementController.cs:20-23`, `AnnouncementService.cs:51`). Fix: add a nullable `CreatorUserId` column to `dbo.Announcements`, store that at creation instead of a baked string, and resolve the display name via `CreatorUserId → Users.Name` **at read time** (falling back to the role label if the creator has no name yet). Read-time resolution avoids ever freezing a stale name into historical announcements.

## Live-query fixes — no schema risk (#4, #5, #7, #8)

- **`student_count`** (`GET /classes`): stop trusting the stubbed `Classes.StudentCount` column; always compute live via the `OUTER APPLY` fallback-count pattern already proven in `ReportingRepository.GetPrincipalAttendanceAsync` (match `Students` by `Grade+Section` or `ClassLabel=Name`).
- **`AttendancePct`** (`dbo.Students`): new per-student live aggregation over `dbo.AttendanceRecords`, modeled on the same `OUTER APPLY` style (net-new query — no existing per-student version to reuse).
- **`next_period`** (`ClassResponse`): derive live from `dbo.TimetableSlots` (`ClassId` + `Day` + next `StartTime` after current time) — no new stored column.
- **Bus `EtaMinutes`**: wire the already-available `SpeedKmh` (selected elsewhere in `BusModule.cs`/`StudentBusModule.cs` but discarded in `GetPositionAsync`'s query) together with the existing Haversine distance-to-next-stop calculation: `EtaMinutes = distance / speed`. Return `null` (never a garbage/divide-by-zero value) when speed is ~0 or missing.

## Small net-new columns, unrelated to each other (#6, #9, #10)

- **Exam topics**: add `Topics` (nvarchar(max), simple delimited or JSON list) to `ExamPapers`; wire into `ExamPaper_Create`/`Update` procs and `ExamPaperResponse`.
- **Leave priority**: add `Priority` (nvarchar(20), default `'medium'`) to `LeaveRequests`, mirroring the existing `Complaints.Priority` pattern; optional param on `Leave_Create`, exposed on `LeaveResponse`.
- **Chat presence**: add `LastSeenAt` (datetime2, nullable) to `Users`, touched by a lightweight authenticated-request middleware (throttled — write only if the existing value is >60s stale, to avoid write-amplification on every API call). `ChatThreadResponse` computes `online = (now - LastSeenAt) < 5 minutes` at query time. Polling-based, matching the app's existing pull model — no WebSocket/real-time push.

## Testing & rollout conventions

- Migrations: sequential `M00NN_Description.cs` (next is `M0084`), FluentMigrator. Proc changes: edit the `.sql` file in place with `CREATE OR ALTER PROCEDURE` (new params get `= NULL` defaults for backward compatibility), then add a new migration that re-executes the embedded resource (existing convention, e.g. `M0083`). `Down()` is typically a no-op per existing convention (prior proc body isn't restored) — new migrations follow the same pattern.
- Tests: xUnit integration tests against a real SQL Server fixture (`tests/Sms.Tests.Integration/SqlServerFixture.cs`). Pattern-match new tests after `AuthFlowTests.cs`, `TimetableTests.cs`, `AcademicsTests.cs`. `MigrationIdempotenceTests.cs` already asserts migrations are safe to re-run — new ones must satisfy it.
- Local migration run: `dotnet run --project db/Sms.Migrations -- "<connectionString>"` (or `ConnectionStrings__Sql` env var) — idempotent, no docker-compose required for the migration step itself.

## Out of scope

- Settings/preferences persistence (item #11) — deferred, full new feature.
- `employee` (employee ID) field on `/auth/me` — no schema source, stays blank.
- Exact `tenant_name` source — confirmed during implementation, not designed here.
- `Parent`/`Student` profile-dispatch branches — pattern extends to them later; no branch added now.
- Timetable `Subject` free-text matching fragility — known limitation, follow-up ticket, not solved in this pass.
- Any `sms-teacher-app` (client-side) changes — that's Phase 2, a separate plan.

## Testing

Per-change: new/updated xUnit integration tests for each of the 10 fixes (identity backfill + `/auth/me` dispatch, timetable filter by role, approvals/announcements naming, the 4 live-query fixes, the 3 new columns). Migration idempotence verified via the existing `MigrationIdempotenceTests.cs` harness. No live smoke test against `sms-teacher-app` in this plan — that happens in Phase 4 after Phase 2 wires the app to consume these fields.
