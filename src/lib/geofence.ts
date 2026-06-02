import * as Location from 'expo-location';
import { AppError } from '@/lib/errors';
import type { CheckEvent, CheckEventKind, SchoolLocation } from '@/data/domain';

/** Max GPS-accuracy value (m) added to the radius when deciding "verified". */
export const ACCURACY_CAP = 50;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Position extends LatLng {
  accuracyMeters: number;
}

const R = 6_371_000; // Earth radius in meters
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters between two coordinates. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance to the school plus whether the position counts as "at school". */
export function evaluate(
  pos: Position,
  school: SchoolLocation
): { distanceMeters: number; verified: boolean } {
  const distanceMeters = haversineMeters(pos, school);
  const buffer = Math.min(pos.accuracyMeters, ACCURACY_CAP);
  const verified = distanceMeters <= school.radiusMeters + buffer;
  return { distanceMeters, verified };
}

/** Build a CheckEvent for the given kind, stamping the current time. */
export function buildCheckEvent(
  kind: CheckEventKind,
  pos: Position,
  school: SchoolLocation
): CheckEvent {
  const { distanceMeters, verified } = evaluate(pos, school);
  return {
    kind,
    at: new Date().toISOString(),
    lat: pos.lat,
    lng: pos.lng,
    accuracyMeters: pos.accuracyMeters,
    distanceMeters,
    verified,
  };
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read the device's current position once, requesting foreground permission.
 * Throws AppError with codes: location_permission_denied | location_off | location_timeout.
 */
export async function getCurrentPosition(): Promise<Position> {
  let permission: Location.LocationPermissionResponse;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new AppError({
      code: 'location_off',
      status: 0,
      message: 'Location services are unavailable on this device.',
    });
  }
  if (permission.status !== 'granted') {
    throw new AppError({
      code: 'location_permission_denied',
      status: 0,
      message: 'Location permission is required to check in.',
    });
  }
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracyMeters: loc.coords.accuracy ?? ACCURACY_CAP,
    };
  } catch {
    throw new AppError({
      code: 'location_timeout',
      status: 0,
      message: "Couldn't get a location fix. Please try again.",
    });
  }
}
