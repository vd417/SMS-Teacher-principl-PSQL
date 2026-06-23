# Production Hardening — Design

**Date:** 2026-06-23
**Branch:** `field-alignment-canonical`
**Status:** Approved (Option B)

## Goal

The `sms-teacher-app` is fully wired to the live `sms-backend` (34 screens → 18 repositories → live endpoints; `tsc` clean; 55 tests green). This effort closes the gap between "wired up" and "safe to ship to a real school" by fixing fabricated/broken UI data, making production builds deployable and observable, and confirming resilience basics — **without** speculative scale-out work the app does not yet need.

## Non-goals (deferred)

- Extending `/v1/auth/me` with the display profile (name/title/employee/classroom) — separate backend schema blocker, tracked in [[teacher-app-live-api]].
- Pagination on lists other than the class roster.
- Offline persistence / cache hydration.
- Push notifications, in-app analytics.

## Problem inventory (verified 2026-06-23)

| #   | Location                                               | Problem                                                                                                                                                                                | Severity    |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| P1  | `src/screens/AttendanceScreen.tsx:31`                  | `ATTENDANCE_DATE = '2026-04-27'` hardcoded — teachers always write attendance to a fixed past date, never today. Core daily workflow broken.                                           | **Blocker** |
| P2  | `src/screens/HomeScreen.tsx:200-211`                   | Present/Absent/Late/Leave stat pills (28/2/1/1) are fabricated; backend `/dashboard/stats` returns only `attendanceToday` (a %). Date string "Monday, 27 Apr 2026" hardcoded (`:186`). | High        |
| P3  | `src/screens/HomeScreen.tsx:104`                       | `upcomingExam = 'Mid-Term Math · May 10'` hardcoded; real data available via `useExams`.                                                                                               | Medium      |
| P4  | `eas.json` (production profile), `src/config/env.ts:4` | Production build ships with placeholder base URL `https://api.schooldesk.local/v1`; no env validation / fail-fast.                                                                     | **Blocker** |
| P5  | (absent)                                               | No crash/error reporting — production failures are invisible.                                                                                                                          | High        |
| P6  | resilience                                             | No verified top-level error boundary / offline signal; mutation retry/backoff unset.                                                                                                   | Medium      |

## Design

### 1. Correctness — fix fabricated & broken data

**P1 — AttendanceScreen date.**

- Replace the module constant with state initialized to today's local date in `YYYY-MM-DD`.
- Add a minimal date stepper (prev/next day, capped at today) so a teacher can back-date but not future-date.
- Query key already includes `date` (`queryKeys.attendance`), so changing the date re-fetches and re-saves correctly with no other change. Add a small date helper `todayISO()` in `src/lib` (pure, unit-tested) to avoid scattering `toISOString().slice(0,10)`.

**P2 — HomeScreen attendance card.**

- Drive the displayed date from `new Date()` via the same `todayISO()`/format helper.
- Remove the four fabricated stat pills. The real `attendanceToday` donut stays (already wired). Rationale: showing invented per-status counts is worse than showing none. If per-status counts are wanted later, they must come from a new backend field — explicitly out of scope, not faked.

**P3 — HomeScreen upcoming exam.**

- Derive from `useExams()`: the soonest exam with a future/today date; render the banner only when one exists, otherwise hide. No new endpoint.

### 2. Deployability — production env config

- Add `src/config/env.ts` validation using Zod: parse `EXPO_PUBLIC_API_BASE_URL` (+ optional maps key). In production (`!__DEV__`), **throw** if the URL is missing, still the placeholder host, or not `https`. In dev, fall back to the existing localhost default.
- Add `preview` and `production` env blocks to `eas.json` carrying the real `EXPO_PUBLIC_API_BASE_URL`, so builds are pinned to the correct backend.
- Unit-test the validator (valid / missing / placeholder-in-prod cases).

### 3. Observability — crash & error reporting

- Integrate `sentry-expo` (Expo-supported). Initialize once at app root behind a `EXPO_PUBLIC_SENTRY_DSN` env var; **no-op when the DSN is absent** so dev and tests are unaffected.
- Route reporting through the existing `AppError` path: report non-network unexpected errors and parse/validation failures with breadcrumbs (path, status, code) — **never** tokens or PII (no Authorization header, no request bodies).
- Wrap the root in a Sentry error boundary that renders the existing error UI.

### 4. Resilience polish

- Confirm/add a top-level `ErrorBoundary` around the navigator that renders the existing `ErrorState` and a "retry" that resets the boundary + query cache.
- Add an offline banner driven by connectivity (lightweight — `@react-native-community/netinfo` if not already present, else a query-error-derived signal).
- Set react-query mutation defaults: `retry: 0` for mutations (avoid double-writes), keep query retry as-is.

## Components touched

- `src/screens/AttendanceScreen.tsx`, `src/screens/HomeScreen.tsx` — data fixes.
- `src/lib/date.ts` (new) + test — `todayISO()`, display formatter.
- `src/config/env.ts` + test — validated env.
- `eas.json` — env blocks.
- `src/lib/sentry.ts` (new) + root wiring in `App`/`AppProviders` — observability.
- `src/components` / `src/ui/state` — error boundary + offline banner (reuse existing `ErrorState`).
- `httpClient`/`errors` — breadcrumb hook (PII-safe).

## Testing

- Unit: `todayISO`/date formatter; env validator (valid/missing/placeholder/prod-throw); Sentry init no-ops without DSN; httpClient breadcrumb redacts auth.
- Existing 55 tests must stay green; `tsc --noEmit` clean.
- Manual smoke: attendance writes to _today_; Home shows today's date and no fake pills; upcoming-exam banner reflects real exams or hides.

## Risks

- Sentry adds a native dependency → requires a new dev build (not Expo Go). Acceptable; the app already uses custom native modules (secure-store, location).
- Removing the stat pills is a visible UI change; that is intended (honesty over fabrication).
