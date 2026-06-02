# Bus Duty Tracking — Design Spec

**Date:** 2026-06-02
**Status:** Approved (pending user spec review)

## Context

The teacher app currently has no transport/bus feature (the only "transport"
reference is a payslip allowance line in `PayslipScreen.tsx:88`). Teachers who
are assigned **bus duty** — supervising a single school bus/route during pickup
or drop-off — have no way to see where their bus is or to record which students
boarded. This feature adds a **Bus Duty** screen that shows the teacher's
assigned bus on a live map and lets them mark and save student boarding status.

The app is Expo + `react-native-web`, runs in Chrome for development, and uses a
swappable **mock / http repository** architecture (mock data in dev, real API in
"live" mode). All new code follows that existing pattern.

### Important reality: the map is real, the bus position is simulated

Google Maps provides real, interactive map tiles. There is **no real vehicle GPS
feed or backend**, so the moving bus marker is driven by **simulated
coordinates** advancing along the route. True live tracking would require vehicle
GPS hardware + a streaming backend and is explicitly out of scope.

## Scope

**In scope**

- One **assigned bus** per teacher (bus-duty model)
- Live map of that bus (real Google Maps on web; stylized fallback otherwise)
- Boarding roster: mark each student Pending → Boarded → Absent, then Save
- Mock + http repositories, hooks, screen, navigation entry, tests

**Out of scope (YAGNI)**

- Real GPS / live vehicle telemetry
- Parent notifications
- Multi-bus or admin overview
- Historical boarding logs / reports
- Native (iOS/Android) Google Maps via `react-native-maps` — only a non-crashing
  fallback is provided for native; full native maps can come later

## Map strategy (key provided later)

- Key read from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` via `src/config/env.ts`.
- **Web (`BusMap.web.tsx`):** if key present → render Google Maps JS
  (`@react-google-maps/api`) with stop markers + animated bus marker; if key
  absent → render the stylized fallback.
- **Native (`BusMap.tsx`):** always render the stylized fallback (no
  `react-native-maps` dependency added now).
- **Stylized fallback:** a vertical route timeline — stops as nodes connected by
  a path, with the bus marker interpolated along `progress` toward the next stop.
  Built with RN `View` + `react-native-svg` + `reanimated` (already deps).
- **Security note:** a Maps-JS key ships to the browser. The user must restrict
  it by HTTP referrer and enable only the Maps JavaScript API in Google Cloud.

## Data model (`src/data/domain/index.ts`)

```ts
export type BoardingStatus = 'pending' | 'boarded' | 'absent';

export interface BusStop {
  id: string;
  name: string;
  time: string; // scheduled time, e.g. "07:45"
  order: number;
  lat: number;
  lng: number;
}
export interface Bus {
  id: string;
  number: string; // e.g. "WBA-07"
  routeName: string; // e.g. "North Loop"
  driver: string;
  driverPhone: string;
  stops: BusStop[];
}
export interface BusPosition {
  busId: string;
  currentStopIndex: number; // index into stops[]
  progress: number; // 0..1 between currentStop and next stop
  lat: number;
  lng: number;
  nextStopName: string;
  etaMinutes: number;
}
export interface BoardingRecord {
  studentId: string;
  studentName: string;
  initials: string;
  stopId: string;
  status: BoardingStatus;
}
```

## Data layer

**Interface** (`src/data/repositories/types.ts`) — add to `Repositories`:

```ts
export interface BusRepository {
  assignedBus(): Promise<Bus>;
  position(busId: string): Promise<BusPosition>;
  roster(busId: string): Promise<BoardingRecord[]>;
  saveBoarding(busId: string, records: BoardingRecord[]): Promise<void>;
}
```

**Mock** (`src/data/mock/bus.repo.ts`) — mirrors `mock/attendance.repo.ts`:

- Seeds one bus, ~5 stops with lat/lng, ~12 students assigned across stops.
- `position()` advances `currentStopIndex`/`progress` a step on each call (state
  held in the store) and interpolates `lat`/`lng` between the current and next
  stop, so the marker visibly moves as the hook polls. Clamps at the last stop.
- `roster()` returns boarding records (default `pending`).
- `saveBoarding()` replaces stored records and `persist()`s — same shape as
  `attendance.save()`.

**Http** (`src/data/http/bus.repo.ts`) — mirrors existing http repos; calls
`GET /bus/assigned`, `GET /bus/:id/position`, `GET /bus/:id/roster`,
`PUT /bus/:id/boarding` and maps responses.

**Wiring**

- `repositories/factory.ts`: `bus: mockBus(store)` / `bus: httpBus(http)`
- `seed.ts` + `SeedShape`: add `buses: Bus[]` and `busBoarding: BoardingRecord[]`
- `lib/queryClient.ts` `queryKeys`: add
  `bus(tenantId)`, `busPosition(tenantId, busId)`, `busRoster(tenantId, busId)`

## Hooks (`src/features/bus/hooks.ts`)

Mirror `features/attendance/hooks.ts`:

- `useAssignedBus()` → `useQuery(queryKeys.bus, repos.bus.assignedBus)`
- `useBusRoster(busId)` → `useQuery(..., enabled: busId !== '')`
- `useBusPosition(busId)` → `useQuery` with `refetchInterval: 3000` (drives the
  live marker), `enabled: busId !== ''`
- `useSaveBoarding(busId)` → `useMutation` with optimistic `onMutate` /
  rollback `onError` / `invalidateQueries` `onSettled`, exactly like
  `useMarkAttendance`

## Screen (`src/screens/BusScreen.tsx`)

`ScreenHeader` + `ScrollView`, matching the visual language of `MoreScreen` /
`AttendanceScreen`:

1. **Bus card** — number, route name, driver (with call affordance), live status
   line ("En route to Oak Street · ~6 min") from `useBusPosition`.
2. **Map** — `<BusMap bus position />` (the platform-split component above).
3. **Boarding roster** — student rows grouped by stop; tapping a row cycles
   Pending → Boarded → Absent (color-coded with theme tokens
   `present`/`absent`/`inkMuted`); a summary pill ("8 / 12 boarded") and a
   **Save** button calling `useSaveBoarding`. Optimistic, with a `Toast` on
   success (reuse existing `Toast` component).

## Navigation

- `navigation/types.ts`: add `BusScreen: undefined` to `HomeStackParamList`.
- `MainTabNavigator.tsx`: register `<HomeStack.Screen name="BusScreen" .../>`.
- `screens/MoreScreen.tsx`: add a `MORE_ITEMS` tile
  `{ icon: 'bus-outline', label: 'Bus Duty', screen: 'BusScreen', color: Colors.blue, soft: Colors.blueSoft }`.

## Config

- `src/config/env.ts`: expose `googleMapsApiKey` from
  `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (optional; empty string default).

## Dependencies

- Add `@react-google-maps/api` (web map). No native maps dependency added now.

## Testing

Mirror existing test trios:

- `__tests__/contracts/bus.contract.test.ts` — mock `BusRepository` satisfies the
  interface and returns well-formed data (follows `contract.ts` helper).
- `__tests__/data/bus.repo.test.ts` — `position()` advances and clamps;
  `saveBoarding()` round-trips through the store.
- `__tests__/features/busHooks.test.tsx` — `useSaveBoarding` optimistic update +
  rollback, mirroring `authHooks`/`classesHooks` tests.

## Verification (end-to-end)

1. `npm test` — new contract/repo/hooks tests pass; full suite green.
2. `npm run lint` — clean.
3. App already runs (`npm run web`, Chrome). Log in → **More** → **Bus Duty**:
   - Bus card shows route/driver/status.
   - Without a key: stylized route map renders, bus marker advances every ~3s.
   - With `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set: real Google map renders with
     stop markers and the moving bus marker.
   - Cycle a few students' boarding states, tap **Save**, confirm the summary
     updates and the state persists across a screen revisit.
