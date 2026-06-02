# Teacher Location-Based Check-In / Check-Out — Design

**Date:** 2026-06-02
**Status:** Approved (pending written-spec review)
**Branch:** feat/bus-duty-tracking (feature will branch from main)

## Summary

Let a teacher mark their own daily attendance — a **check-in** on arrival and a
**check-out** on departure — with each punch verified against the school's
location. If the teacher is within the school's configured radius, the punch is
**verified**; if not, it is still saved but **flagged** ("unverified location")
for admin review. The only hard block is when the device cannot provide a
location at all (permission denied / location services off).

This is distinct from the existing **student** attendance feature
(`AttendanceScreen` + `attendance.repo.ts`), which a teacher uses to mark a
class. This new feature is the teacher's _own_ time clock.

## Decisions (from brainstorming)

| Question                           | Decision                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Out-of-radius behavior             | **Warn + allow with flag** (`verified: false`). Not a hard block.                                                      |
| School coordinates + radius source | Through the **data layer** — mock repo hardcodes it now (radius defaults to **10 m**), real API later.                 |
| Check-in scope                     | **Check-in _and_ check-out**, once per day, both geofence-verified.                                                    |
| Entry points                       | Quick **card on Home** + full **"My Attendance" screen on the Me/Profile tab**.                                        |
| My Attendance screen content       | **Today + recent history + monthly summary**.                                                                          |
| Verification ownership             | **Client decides** (Option A), but the raw location is stored so the backend can re-verify later with no model change. |

### Judgment calls (explicit)

- **Permission denied / location off is the only hard block.** It is about
  device capability, not the teacher's range. Everything else is warn-and-flag.
- **Accuracy buffer with a cap.** A punch is verified when
  `distance <= radius + min(gpsAccuracy, ACCURACY_CAP)` with `ACCURACY_CAP = 50 m`.
  The buffer stops GPS noise from flagging honest teachers at a tight 10 m
  radius; the cap stops a wildly inaccurate fix from auto-verifying everything.

## Architecture

The app uses a repository pattern switched by `EXPO_PUBLIC_DATA_SOURCE`
(`mock` | `live`): domain types → `mock` repo / `http` repo, registered in the
`Repositories` registry (`src/data/repositories/types.ts`) and built in
`factory.ts`. Feature logic lives in `src/features/<name>/hooks.ts` using
react-query with `useTenantId()` + `queryKeys`. This feature follows that
pattern exactly (modeled on the `bus` feature).

New dependency: **`expo-location`** (Expo's standard geolocation module; works
on native and web).

### Component map

```
src/data/domain/index.ts                 # new types (below)
src/data/repositories/types.ts           # + MyAttendanceRepository, + registry entry
src/data/mock/myAttendance.repo.ts       # hardcoded school location + in-memory days
src/data/http/myAttendance.repo.ts       # stubbed live endpoints
src/data/repositories/factory.ts         # wire mock + http
src/lib/geofence.ts                      # expo-location wrapper + haversine + evaluate
src/features/teacherAttendance/hooks.ts  # react-query hooks
src/screens/MyAttendanceScreen.tsx       # full screen (Me tab)
src/screens/HomeScreen.tsx               # + My Attendance card
src/screens/ProfileScreen.tsx            # + row linking to MyAttendanceScreen
src/navigation/types.ts + stack          # register MyAttendanceScreen
```

## Data model (`src/data/domain/index.ts`)

```ts
// Where the school is, and how close you must be — comes from the repo
export interface SchoolLocation {
  lat: number;
  lng: number;
  radiusMeters: number; // mock defaults to 10
  name: string;
}

export type CheckEventKind = 'in' | 'out';

// One geofence-verified punch
export interface CheckEvent {
  kind: CheckEventKind;
  at: string; // ISO timestamp
  lat: number;
  lng: number;
  accuracyMeters: number; // GPS-reported accuracy
  distanceMeters: number; // computed distance to the school
  verified: boolean; // distance <= radius + min(accuracy, ACCURACY_CAP)
}

// A teacher's day
export interface TeacherAttendanceDay {
  date: string; // YYYY-MM-DD
  checkIn?: CheckEvent;
  checkOut?: CheckEvent;
}

export interface TeacherAttendanceSummary {
  daysPresent: number;
  daysFlagged: number; // days with any unverified punch
  totalHours: number; // sum of (checkOut - checkIn)
}
```

`verified: false` is the "warn + allow with flag" state — the punch is saved
regardless.

## Repository (`MyAttendanceRepository`)

New entry in the `Repositories` registry:

```ts
export interface MyAttendanceRepository {
  schoolLocation(): Promise<SchoolLocation>;
  today(): Promise<TeacherAttendanceDay>;
  history(limit: number): Promise<TeacherAttendanceDay[]>;
  summary(month: string): Promise<TeacherAttendanceSummary>; // 'YYYY-MM'
  punch(event: CheckEvent): Promise<TeacherAttendanceDay>; // returns updated day
}
```

- **Mock** (`src/data/mock/myAttendance.repo.ts`): hardcoded `SchoolLocation`
  with a **10 m** radius; in-memory day store using `simulateLatency()` and
  `store.persist`; seeded with a few past days so history and summary are not
  empty. `punch` merges the event into today's record (in or out) and returns
  the updated day.
- **HTTP** (`src/data/http/myAttendance.repo.ts`): stubbed endpoints, e.g.
  `GET /me/attendance/school-location`, `GET /me/attendance/today`,
  `GET /me/attendance/history?limit=`, `GET /me/attendance/summary?month=`,
  `POST /me/attendance/punch`. Because the raw `lat/lng/accuracy` are sent, the
  real backend can re-verify server-side later (Option B/C) with **no model
  change**.
- Wired into `factory.ts` (`createMockRepositories` + `createHttpRepositories`).

## Location service (`src/lib/geofence.ts`)

The single module that touches `expo-location`:

- `getCurrentPosition(): Promise<{ lat; lng; accuracyMeters }>` — requests
  foreground permission, reads one position, throws typed errors:
  `PERMISSION_DENIED`, `LOCATION_OFF`, `TIMEOUT`.
- `haversineMeters(a, b): number` — pure great-circle distance (unit-tested).
- `evaluate(pos, school): { distanceMeters; verified }` where
  `verified = distanceMeters <= school.radiusMeters + Math.min(pos.accuracyMeters, ACCURACY_CAP)`,
  `ACCURACY_CAP = 50`.

`buildCheckEvent(kind, pos, school)` (in the hook or service) assembles the
`CheckEvent` from `pos` + `evaluate`.

## Hooks (`src/features/teacherAttendance/hooks.ts`)

react-query hooks mirroring `bus/hooks.ts` (`useRepositories`, `useTenantId`,
`queryKeys`):

- `useSchoolLocation()` — query, long cache.
- `useMyAttendanceToday()` — query.
- `useMyAttendanceHistory(limit = 30)` — query.
- `useMyAttendanceSummary(month)` — query.
- `usePunch()` — mutation; reads current position, builds the `CheckEvent`,
  calls `repos.myAttendance.punch`, and invalidates today / history / summary
  on success.

New `queryKeys` entries (tenant-scoped) added to `src/lib/queryClient.ts`.

## UI

### Home card (`HomeScreen`)

A "My Attendance" card reflecting today's state:

- **Not checked in** → primary `Check In` button.
- **Checked in** → shows check-in time + `Check Out` button.
- **Both done** → shows in/out times (read-only for the day).
- Once a position is read, a live hint: `📍 8 m from school ✓` (verified) or a
  warning tint when outside the radius.

### My Attendance screen (`MyAttendanceScreen`, reached from Me/Profile tab)

- **Today block**: status + in/out times, verified/flagged indicator.
- **Monthly summary row**: days present, days flagged, total hours.
- **Recent history list**: scrollable; each day shows in/out times and a small
  **"unverified location"** badge for flagged punches.
- Uses existing UI primitives (`ScreenHeader`, `Toast`, theme tokens, reanimated
  entrance animations) consistent with `AttendanceScreen` / `BusScreen`.

### Navigation

Register `MyAttendanceScreen` in the appropriate stack
(`src/navigation/types.ts` + stack file) and add a row on `ProfileScreen`
linking to it — following how `BusScreen` was wired in.

## Error handling & edge cases

- **Permission denied / location off** → punch blocked with a clear message and
  a retry / open-settings path. The only hard block (capability, not range).
- **Outside radius** → proceeds; saved with `verified: false`. Warn copy: "We
  couldn't confirm you're at school — this will be flagged."
- **Double check-in / check-out before check-in** → prevented by today's state;
  buttons reflect only the allowed action.
- **Web** → `expo-location` uses the browser geolocation API; if unavailable,
  treated as `LOCATION_OFF`.
- **Slow / no fix** → `TIMEOUT` typed error surfaced with retry.

## Testing

- **Unit** (`src/lib/geofence`): `haversineMeters` against known coordinate
  pairs; `evaluate` for inside / outside / buffer-edge / huge-accuracy-cap.
- **Contract** (`src/__tests__/contracts/myAttendance.contract.test.ts`):
  mirrors `attendance.contract.test.ts` so mock and future http implementations
  stay in sync (shape of `schoolLocation`, `today`, `history`, `summary`,
  `punch`).
- **Render/smoke**: Home card states (none → checked-in → done → flagged) and
  the My Attendance screen list rendering.

## Out of scope (YAGNI)

- Admin-side review UI for flagged punches (this app is teacher-only).
- Background / automatic geofence triggers — check-in is an explicit tap.
- Server-side re-verification logic (data model supports it; not built now).
- Multi-school selection UI (repo returns the teacher's single school).
- Editing or deleting past punches.
