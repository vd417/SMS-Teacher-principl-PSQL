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
