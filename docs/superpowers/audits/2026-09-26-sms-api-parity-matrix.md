# sms-api Parity Matrix (Teacher App)

- Spec: `docs/superpowers/specs/2026-09-26-sms-api-end-to-end-wiring-design.md`
- Plan: `docs/superpowers/plans/2026-09-26-sms-api-end-to-end-wiring.md`
- Source of truth: controller → policy → DTO → SQL proc/schema → live HTTP → app zod schema. `teacher-api.md` is NOT authoritative.

## Baseline at implementation start (2026-09-26)

- **sms-teacher-app:** branch `feat/sms-api-wiring`, created from `main` @ `22b0d6f`. Clean.
- **sms-api:** isolated git worktree `D:\convert\SMS backend\sms-api-teacher-wiring`, branch `feat/teacher-app-sms-api-wiring`, created from `postgres-migration` @ `34af78e`. Clean.
  - The original `sms-api` folder is in use by another session, on branch `feat/sms-api-e2e-wiring` @ `ab016ae` with its API on :5262. It is not touched by this work.
- **`sms_dev` migration status:** baseline present, 0001–0004 applied, no pending migrations. Checked with a read-only `Sms.PgMigrator status`.
- **API under test:** the worktree build on `http://localhost:5162`, with `/health/ready` returning 200.
  - The shared user-secrets bind Kestrel to :5262, so it is started with the env override `Kestrel__Endpoints__Http__Url=http://0.0.0.0:5162`. No secret was read.
- **Pre-existing app gate state:**
  - jest: 371 passed, 5 failed, in 5 suites: `AuthProvider.test.tsx`, `AttendancePickClassScreen.test.tsx`, `AttendancePickSectionScreen.test.tsx`, `PrincipalAttendanceScreen.test.tsx`, `StaffAttendanceScreen.test.tsx`. These are baseline failures, not regressions.
  - `tsc --noEmit`: clean.
  - eslint: 0 errors, 84 warnings.
- **Pre-existing API gate state:** the build has 0 warnings and 0 errors. Unit tests: 450 passed. Integration tests: 804 passed. Nothing skipped.

## Rows
(filled in by Task 7)
