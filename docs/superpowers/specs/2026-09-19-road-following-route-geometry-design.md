# Road-Following Route Geometry — sms-teacher-app Design

Status: Approved (pending final pre-implementation sign-off)
Repo: sms-teacher-app
Depends on: `sms-backend` spec
`docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`
(canonical `GET /v1/transport/routes/{routeId}/geometry` contract, gated by
the new per-route `CanViewRouteAsync` check rather than Principal-only —
this is what makes teacher access to this endpoint possible at all).

## 1. Objective

Replace the straight-line route polyline in the teacher app's fleet/bus
map with road-following geometry from the canonical backend endpoint,
without touching live GPS/SignalR consumption or existing permissions.

## 2. Existing architecture (from audit)

- `react-native-maps` (native, `PROVIDER_GOOGLE`) with a `.web.tsx`
  fallback using `@react-google-maps/api`.
- `src/components/transport/FleetMap.tsx` (native) /
  `FleetMap.web.tsx` (web) — used from
  `src/screens/principal/PrincipalTransportScreen.tsx`; `src/screens/BusScreen.tsx`
  is the teacher's own bus view.
- Straight-line construction (both native and web variants):
  ```js
  const routePath = selectedBus?.stops?.length
    ? [...selectedBus.stops].sort((a, b) => a.order - b.order)
        .map((s) => ({ latitude: s.lat, longitude: s.lng }))
    : undefined
  <Polyline coordinates={routePath} strokeColor={...} strokeWidth={4} />
  ```
- Live GPS: SignalR via `@microsoft/signalr`, `useTransportFleetPush`
  (`src/features/transport/hooks.ts`), joins `JoinBus`/`JoinMyChildrenBuses`,
  merges pushes into React Query cache via `applyPositionToBusPosition` /
  `applyPositionToBusRows` (`src/lib/transportHub.ts`, `src/lib/busTracking.ts`).
  **Not touched by this spec.**
- Route/stop data: `src/data/http/bus.repo.ts` `httpBus(http).assignedBus()`
  → `GET /bus/assigned` → `BusDTO { ..., stops: BusStopDTO[] }`,
  `BusStopDTO = { id, name, time, seq, lat, lng }`. No `geometry` field
  exists in `BusDTO`/`Bus` today — additive fetch, not a DTO change.

## 3. Exact files/components involved

New:

- `src/data/http/routeGeometry.repo.ts` — client for
  `GET /v1/transport/routes/{routeId}/geometry` (same response shape as
  the backend contract), following the existing `bus.repo.ts` pattern.
- `src/lib/decodePolyline.ts` — Google encoded-polyline decoder (mirrors
  the equivalent added in sms-admin; each repo keeps its own copy since
  there is no shared package between these codebases).
- `src/features/transport/useRouteGeometry.ts` — React Query hook, keyed
  by `routeId`, fetched once per route (no polling, not tied to the
  SignalR push cycle).

Modified:

- `src/components/transport/FleetMap.tsx` and `FleetMap.web.tsx` — replace
  the `routePath` construction with: if geometry `status === 'available'`,
  decode and render the road polyline; if `'unavailable'`, render no route
  line and show an inline "Route unavailable" note, keeping bus markers,
  stop markers, and all existing controls untouched.
- `src/screens/principal/PrincipalTransportScreen.tsx`,
  `src/screens/BusScreen.tsx` — call `useRouteGeometry` for the
  currently-selected bus's `routeId` and pass the result to `FleetMap`.

## 4. API contract (consumed, not defined here)

**Confirmed final wire format** (verified against the shipped backend, not
assumed): the raw HTTP response is snake_case, wrapped in this backend's
standard envelope — `{ "data": { "route_id": "...", "status": "available",
"distance_meters": 4210, ... } }`. Whatever this app's shared HTTP client
does with that envelope (some wrappers already unwrap one `data` level,
some return the raw body) determines whether the repo function reads
`res.data.route_id` or `res.data.data.route_id` — this is exactly why
Task 2, Step 1 of the implementation plan requires reading `bus.repo.ts`'s
existing unwrapping convention first rather than guessing; do not assume
either shape without confirming it against a working existing call in this
app.

## 5. Data model / migration

None — this app has no backing database.

## 6. Authentication / authorization

Uses the same auth token this app already sends on every request. The
backend enforces per-route access via `CanViewRouteAsync`; a teacher only
receives geometry for routes/buses they are already authorized to view via
existing bus-duty/assignment rules. No new permission concept in this app.

## 7. Error handling

`status: 'unavailable'` or a failed fetch → no route line drawn, "Route
unavailable" indicator shown, live bus marker and everything else on the
map keeps working exactly as today. The existing straight-line
construction code may remain as inert legacy code (not deleted) but must
not run as a silent fallback once this ships.

## 8. Caching / performance

One fetch per selected route via React Query defaults; SignalR pushes
(`useTransportFleetPush`) update only the bus position query and never
trigger a geometry refetch.

## 9. Testing

- Unit test for `decodePolyline.ts` against known fixtures.
- Component test for `FleetMap`/`FleetMap.web` covering both `available`
  and `unavailable` geometry states, confirming bus/stop markers and
  live-push behavior are unaffected.
- Regression: existing transport/bus-duty tests continue passing
  unmodified.

## 10. Rollback / safety considerations

Additive only — removing the new hook/repo file and reverting the prop
change fully rolls this back with no data impact.

## 11. Dependencies

Requires the `sms-backend` spec's endpoint (including the
`CanViewRouteAsync` authorization extension) to be deployed before this
can be verified end-to-end; can be built/tested against a mocked response
beforehand.

## 12. Non-goals

- Not touching SignalR/live GPS consumption, teacher authorization rules,
  bus-duty assignment logic, or any screen/UI beyond the map's route line.
- Not creating a teacher-specific routing calculation or API.
