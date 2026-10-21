export type MapPoint = { lat: number; lng: number };

export function busMapCenter(
  position?: { lat?: number | null; lng?: number | null },
  stops: { lat?: number | null; lng?: number | null }[] = []
): MapPoint | undefined {
  if (
    typeof position?.lat === 'number' &&
    Number.isFinite(position.lat) &&
    typeof position?.lng === 'number' &&
    Number.isFinite(position.lng)
  ) {
    return { lat: position.lat, lng: position.lng };
  }
  const first = stops.find(
    (s) =>
      typeof s.lat === 'number' &&
      Number.isFinite(s.lat) &&
      typeof s.lng === 'number' &&
      Number.isFinite(s.lng)
  );
  if (!first || first.lat == null || first.lng == null) return undefined;
  return { lat: first.lat, lng: first.lng };
}

/** Where the fleet map should open. Live GPS wins, then the CRM road route, then a stop. */
export function fleetMapFocus(
  located: MapPoint[],
  route: MapPoint[] = [],
  stops: MapPoint[] = []
): MapPoint | undefined {
  const live = located.find((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (live) {
    return {
      lat: located.reduce((sum, p) => sum + p.lat, 0) / located.length,
      lng: located.reduce((sum, p) => sum + p.lng, 0) / located.length,
    };
  }
  const path = route.find((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (path) return path;
  return stops.find((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}
