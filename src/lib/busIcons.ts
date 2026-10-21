import type { MapPoint } from '@/lib/busMapCenter';

/** Yellow school-bus body from the admin live map. Route lines use a different palette. */
export const BUS_BODY_COLOR = '#FFC107';

/** Same 12 route colors as the admin live-bus map, one per visible route. */
const ROUTE_PALETTE = [
  '#2563eb',
  '#0d9488',
  '#c026d3',
  '#ea580c',
  '#65a30d',
  '#db2777',
  '#0891b2',
  '#7c3aed',
  '#ca8a04',
  '#dc2626',
  '#059669',
  '#4338ca',
];

export function routeColor(routeKey: string | undefined): string {
  const key = (routeKey ?? '').trim() || 'route';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  return ROUTE_PALETTE[hash % ROUTE_PALETTE.length];
}

/** One color per route, in the same order the admin map uses. */
export function assignRouteColors(routeIds: string[]): Map<string, string> {
  const unique = [...new Set(routeIds.map((id) => id.trim()).filter(Boolean))].sort();
  return new Map(unique.map((id, index) => [id, ROUTE_PALETTE[index % ROUTE_PALETTE.length]]));
}

/** Admin live map: green while the bus is moving, gray when it is stopped. */
export function busStatusColor(speedKmh?: number): string {
  return typeof speedKmh === 'number' && speedKmh > 3 ? '#16a34a' : '#64748b';
}

export type BusIconInput = {
  busId: string;
  busNo: string;
  routeId?: string;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  /** GPS heading in degrees. When missing, the icon points along the route. */
  heading?: number;
};

export type RoutePath = {
  routeId: string;
  path: MapPoint[];
};

export type BusIconPlacement = {
  busId: string;
  busNo: string;
  routeId?: string;
  lat: number;
  lng: number;
  /** Route line color. The bus body stays yellow, matching the admin live map. */
  color: string;
  /** Degrees clockwise from north, so the bus points along its route. */
  heading: number;
  moving: boolean;
  speedKmh?: number;
};

function hasPoint(lat?: number, lng?: number): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function bearing(from: MapPoint, to: MapPoint): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function headingAlong(path: MapPoint[], t: number): number {
  if (path.length < 2) return 0;
  const scaled = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const index = Math.min(Math.floor(scaled), path.length - 2);
  return bearing(path[index], path[index + 1]);
}

function headingNear(path: MapPoint[], point: MapPoint): number {
  if (path.length < 2) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const dLat = path[i].lat - point.lat;
    const dLng = path[i].lng - point.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = bearing(path[i], path[i + 1]);
    }
  }
  return best;
}

function liveHeading(bus: BusIconInput, path: MapPoint[], point: MapPoint, t?: number): number {
  if (typeof bus.heading === 'number' && Number.isFinite(bus.heading)) return bus.heading;
  if (t != null) return headingAlong(path, t);
  return headingNear(path, point);
}

function movingOf(bus: BusIconInput): boolean {
  return typeof bus.speedKmh === 'number' && bus.speedKmh > 3;
}

function along(path: MapPoint[], t: number): MapPoint {
  if (path.length <= 1) return path[0];
  const scaled = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const start = path[Math.min(index, path.length - 1)];
  const end = path[Math.min(index + 1, path.length - 1)];
  return {
    lat: start.lat + (end.lat - start.lat) * fraction,
    lng: start.lng + (end.lng - start.lng) * fraction,
  };
}

/**
 * One bus icon per bus. A live GPS ping wins. Otherwise the bus sits on its own
 * route, spread along the road so buses that share a route do not stack.
 */
export function placeBusIcons(buses: BusIconInput[], routes: RoutePath[]): BusIconPlacement[] {
  const pathByRoute = new Map(
    routes.map((route) => [route.routeId, route.path.filter((p) => hasPoint(p.lat, p.lng))])
  );
  const colors = assignRouteColors(routes.map((route) => route.routeId));
  const waiting = new Map<string, BusIconInput[]>();
  const placed: BusIconPlacement[] = [];

  for (const bus of buses) {
    if (hasPoint(bus.lat, bus.lng)) {
      const routeId = bus.routeId?.trim();
      const path = routeId ? (pathByRoute.get(routeId) ?? []) : [];
      placed.push({
        busId: bus.busId,
        busNo: bus.busNo,
        routeId: bus.routeId,
        lat: bus.lat,
        lng: bus.lng,
        color: (routeId && colors.get(routeId)) || routeColor(bus.routeId || bus.busId),
        heading: liveHeading(bus, path, { lat: bus.lat, lng: bus.lng }),
        moving: movingOf(bus),
        speedKmh: bus.speedKmh,
      });
      continue;
    }
    const routeId = bus.routeId?.trim();
    if (!routeId || (pathByRoute.get(routeId)?.length ?? 0) === 0) continue;
    const group = waiting.get(routeId) ?? [];
    group.push(bus);
    waiting.set(routeId, group);
  }

  for (const [routeId, group] of waiting) {
    const path = pathByRoute.get(routeId) ?? [];
    group.forEach((bus, index) => {
      const t = (index + 1) / (group.length + 1);
      const point = along(path, t);
      placed.push({
        busId: bus.busId,
        busNo: bus.busNo,
        routeId,
        lat: point.lat,
        lng: point.lng,
        color: colors.get(routeId) || routeColor(routeId),
        heading: liveHeading(bus, path, point, t),
        moving: movingOf(bus),
        speedKmh: bus.speedKmh,
      });
    });
  }

  return placed;
}
