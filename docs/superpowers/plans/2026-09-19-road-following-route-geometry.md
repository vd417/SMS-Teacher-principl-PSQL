# Road-Following Route Geometry (sms-teacher-app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the straight-line route polyline in `FleetMap`/`FleetMap.web` with road-following geometry from the canonical backend endpoint, without touching SignalR live-position consumption or teacher authorization.

**Architecture:** A new HTTP repo function + polyline decoder + React Query hook feed a decoded road path into `FleetMap`/`FleetMap.web`, replacing the current `routePath` straight-line construction. Falls back to an explicit "Route unavailable" state, never the old straight line, when geometry isn't available.

**Tech Stack:** React Native/Expo, `react-native-maps` (native) + `@react-google-maps/api` (`.web.tsx`), TanStack React Query, `@microsoft/signalr` (untouched by this plan).

**Spec:** `docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`

## Global Constraints

- Depends on the finalized `sms-backend` contract: `GET /v1/transport/routes/{routeId}/geometry` → `{ routeId, status, format, geometry, distanceMeters, durationSeconds, stopSequenceHash, generatedAt }` — camelCase as shown; confirm this app's HTTP layer's casing convention (check an existing repo file like `bus.repo.ts` for whether it manually snake→camel maps or the API already returns camelCase to this app) before assuming the shape below needs no field mapping.
- Never fall back to the existing straight-line `routePath` construction as production behavior when geometry is `unavailable` — show a "Route unavailable" indicator instead. The existing straight-line code may stay in the file unused.
- Do not touch `useTransportFleetPush`, `JoinBus`/`JoinMyChildrenBuses`, `applyPositionToBusPosition`/`applyPositionToBusRows`, or any bus-duty/teacher authorization logic.
- Do not call the geometry endpoint on every SignalR push — fetch once per selected route via React Query, independent of the live-position query.

---

### Task 1: `decodePolyline` utility

**Files:**

- Create: `src/lib/decodePolyline.ts`
- Test: `src/lib/decodePolyline.test.ts`

**Interfaces:**

- Produces: `function decodePolyline(encoded: string): { latitude: number; longitude: number }[]` — note the field names are `latitude`/`longitude` (not `lat`/`lng`) to match this app's existing `routePath`/`Polyline` coordinate shape (`{ latitude: s.lat, longitude: s.lng }`), so no remapping is needed at the call site.

- [ ] **Step 1: Write the failing test**

```ts
import { decodePolyline } from './decodePolyline';

describe('decodePolyline', () => {
  it('decodes a known Google encoded polyline fixture', () => {
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(result).toHaveLength(3);
    expect(result[0].latitude).toBeCloseTo(38.5, 4);
    expect(result[0].longitude).toBeCloseTo(-120.2, 4);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/decodePolyline.test.ts` (or this repo's actual test command — check `package.json` `"test"` script first, since it may be `jest`, `expo test`, or `vitest`)
Expected: FAIL (module does not exist)

- [ ] **Step 3: Write the implementation**

```ts
/** Decodes Google's polyline algorithm format into RN-Maps-shaped coordinates. */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded) return [];
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeSignedValue();
    lng += decodeSignedValue();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;

  function decodeSignedValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/decodePolyline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/decodePolyline.ts src/lib/decodePolyline.test.ts
git commit -m "feat(transport): add Google encoded-polyline decoder"
```

---

### Task 2: Route geometry repo function + hook

**Files:**

- Create: `src/data/http/routeGeometry.repo.ts`
- Create: `src/features/transport/useRouteGeometry.ts`
- Test: `src/data/http/routeGeometry.repo.test.ts`

**Interfaces:**

- Consumes: whatever this app's shared HTTP client is (check `src/data/http/bus.repo.ts`'s constructor/import pattern — e.g. `httpBus(http)` — and mirror it exactly for naming and the request-building convention).
- Produces:

  ```ts
  export interface RouteGeometryDTO {
    routeId: string;
    status: 'available' | 'unavailable';
    format: string | null;
    geometry: string | null;
    distanceMeters: number | null;
    durationSeconds: number | null;
    stopSequenceHash: string;
    generatedAt: string | null;
  }
  export function httpRouteGeometry(http: HttpClient): {
    get(routeId: string): Promise<RouteGeometryDTO>;
  };
  export function useRouteGeometry(
    routeId: string | null | undefined
  ): UseQueryResult<RouteGeometryDTO>;
  ```

- [ ] **Step 1: Read `src/data/http/bus.repo.ts` in full first**

Before writing any code in this task, open `src/data/http/bus.repo.ts` and copy its exact patterns for: the `http` client type/import, how a GET request is issued, how the response's `data` envelope is unwrapped, and how field names are cased (this app's `BusDTO`/`BusStopDTO` use snake_case field names like `bus_no`, `route_name` — confirm whether `httpBus`'s mapper does the snake→camel conversion, or whether callers do it, and mirror that exact mechanism here rather than assuming the shape in Task 2's interface above is already camelCased on the wire).

- [ ] **Step 2: Write the failing repo test**, mirroring whatever test exists for `bus.repo.ts` (check for `src/data/http/bus.repo.test.ts` and copy its HTTP-mocking style — likely a fake `http.get`/`http.request` implementation):

```ts
import { httpRouteGeometry } from './routeGeometry.repo';

describe('httpRouteGeometry', () => {
  it('gets route geometry for a route id', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: {
          route_id: 'r1',
          status: 'available',
          format: 'google-encoded-polyline',
          geometry: 'abc',
          distance_meters: 100,
          duration_seconds: 10,
          stop_sequence_hash: 'h',
          generated_at: '2026-09-19T10:00:00Z',
        },
      }),
    };
    const repo = httpRouteGeometry(http as any);
    const result = await repo.get('r1');
    expect(result.status).toBe('available');
    expect(result.geometry).toBe('abc');
  });
});
```

Adjust the mock shape/assertions once Step 1's read confirms the actual `http` client interface and casing convention.

- [ ] **Step 3: Run test to verify it fails**

Run: this repo's test command, filtered to `routeGeometry.repo.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 4: Write `routeGeometry.repo.ts`**, following exactly the pattern confirmed in Step 1 (illustrative shape — replace with the real `http` call signature and mapper used by `bus.repo.ts`):

```ts
export interface RouteGeometryDTO {
  routeId: string;
  status: 'available' | 'unavailable';
  format: string | null;
  geometry: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  stopSequenceHash: string;
  generatedAt: string | null;
}

export function httpRouteGeometry(http: HttpClient) {
  return {
    async get(routeId: string): Promise<RouteGeometryDTO> {
      const res = await http.get(`/transport/routes/${routeId}/geometry`);
      return toRouteGeometry(res.data);
    },
  };
}

function toRouteGeometry(raw: any): RouteGeometryDTO {
  return {
    routeId: raw.route_id,
    status: raw.status,
    format: raw.format,
    geometry: raw.geometry,
    distanceMeters: raw.distance_meters,
    durationSeconds: raw.duration_seconds,
    stopSequenceHash: raw.stop_sequence_hash,
    generatedAt: raw.generated_at,
  };
}
```

- [ ] **Step 5: Write `useRouteGeometry`**, mirroring `useTransportFleetPush`'s import/query-client conventions in `src/features/transport/hooks.ts`:

```ts
export function useRouteGeometry(routeId: string | null | undefined) {
  return useQuery({
    queryKey: ['transport', 'routeGeometry', routeId],
    queryFn: () => httpRouteGeometry(http).get(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: this repo's test command, filtered to `routeGeometry.repo.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/data/http/routeGeometry.repo.ts src/data/http/routeGeometry.repo.test.ts src/features/transport/useRouteGeometry.ts
git commit -m "feat(transport): add route geometry repo function and hook"
```

---

### Task 3: Wire road geometry into `FleetMap` (native) and `FleetMap.web`

**Files:**

- Modify: `src/components/transport/FleetMap.tsx`
- Modify: `src/components/transport/FleetMap.web.tsx`
- Test: whichever test file (if any) already covers `FleetMap` — check for `FleetMap.test.tsx` before creating a new one

**Interfaces:**

- Consumes: `decodePolyline` (Task 1), `useRouteGeometry` (Task 2).

- [ ] **Step 1: Read the current `routePath` construction in both files in full** (the audit captured the relevant excerpt: `selectedBus?.stops?.length ? [...selectedBus.stops].sort(...).map(...) : undefined`, then `<Polyline coordinates={routePath} .../>` — read the full surrounding component in both files to see exactly where `routePath` is computed and consumed before editing).

- [ ] **Step 2: Write the failing test** (skip this step with a note in the final report if this component has no existing test infrastructure exercising rendered output — `react-native-maps` and its web equivalent typically need mocking; check for an existing pattern first, e.g. a `jest.mock('react-native-maps', ...)` elsewhere in this repo, and reuse it):

```tsx
it('shows a Route unavailable indicator when geometry is unavailable', () => {
  const { getByText } = render(
    <FleetMap
      selectedBus={{
        id: 'b1',
        routeId: 'r1',
        stops: [
          /* ...two stops... */
        ],
      }}
      routeGeometry={{ status: 'unavailable', geometry: null /* ... */ }}
    />
  );
  expect(getByText(/route unavailable/i)).toBeTruthy();
});
```

- [ ] **Step 3: Run test to verify it fails** (skip if Step 2 was skipped)

- [ ] **Step 4: Add a `routeGeometry` prop and swap the polyline source in both files**

In each file, add `routeGeometry?: RouteGeometryDTO` to the component's props type. Replace:

```js
const routePath = selectedBus?.stops?.length
  ? [...selectedBus.stops]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ latitude: s.lat, longitude: s.lng }))
  : undefined;
```

with:

```js
const roadPath =
  routeGeometry?.status === 'available' && routeGeometry.geometry
    ? decodePolyline(routeGeometry.geometry)
    : undefined;
```

and the existing render:

```jsx
<Polyline coordinates={routePath} strokeColor={...} strokeWidth={4} />
```

with:

```jsx
{roadPath && <Polyline coordinates={roadPath} strokeColor={...} strokeWidth={4} />}
{routeGeometry?.status === 'unavailable' && <RouteUnavailableBadge />}
```

adding a small `RouteUnavailableBadge` component (plain `<View><Text>Route unavailable</Text></View>` styled consistently with this file's existing overlay conventions — check for an existing small-badge/overlay component in this file or `src/components/transport/` to reuse its styling rather than inventing new style values). The original `routePath` variable/logic may be left in the file unused (per the "keep as inert legacy code" requirement) or removed if this repo's lint rules reject unused variables — check `.eslintrc`/lint config for a `no-unused-vars` rule before deciding, and if it would fail lint, delete the dead variable rather than leaving a lint failure.

- [ ] **Step 5: Wire the hook at the call site**

In `src/screens/principal/PrincipalTransportScreen.tsx` and `src/screens/BusScreen.tsx`, call `useRouteGeometry(selectedBus?.routeId)` and pass its `.data` as the new `routeGeometry` prop to `FleetMap`.

- [ ] **Step 6: Run test to verify it passes** (skip if Step 2/3 were skipped)

- [ ] **Step 7: Manual verification**

Run the app (`npx expo start`), open the principal transport screen and the teacher's own bus screen, select a bus, and confirm: stop markers, live bus marker, and SignalR-driven position updates all behave exactly as before; the route line renders from decoded geometry once the backend is deployed, or shows "Route unavailable" with no line beforehand.

- [ ] **Step 8: Commit**

```bash
git add src/components/transport/FleetMap.tsx src/components/transport/FleetMap.web.tsx src/screens/principal/PrincipalTransportScreen.tsx src/screens/BusScreen.tsx
git commit -m "feat(transport): render road-following geometry in FleetMap, preserving live GPS/SignalR"
```

---

### Task 4: Full regression pass

- [ ] **Step 1: Run the full test suite**

Run: this repo's test command (check `package.json`)
Expected: PASS — including all existing transport/bus-duty tests, unmodified.

- [ ] **Step 2: Confirm no unrelated files changed**

Run: `git status` and `git diff --stat`
Expected: only files from Tasks 1–3 changed; `useTransportFleetPush`, `transportHub.ts`, `busTracking.ts`, and teacher authorization/bus-duty logic untouched.
