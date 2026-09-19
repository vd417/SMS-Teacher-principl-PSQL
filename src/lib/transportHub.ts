/** Pure helpers for the TransportFleetHub live position push (teacher + principal bus screens). */
import { z } from 'zod';
import type { BusPosition, FleetBus } from '@/data/domain';

export const TRANSPORT_HUB_PUSH_EVENT = 'position_update';

export function transportHubUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  const origin = trimmed.replace(/\/v\d+$/i, '');
  return `${origin}/hubs/transport-fleet`;
}

const busPositionPushSchema = z
  .object({
    bus_id: z.string(),
    lat: z.number().nullish(),
    lng: z.number().nullish(),
    speed_kmh: z.number().nullish(),
    next_stop_name: z.string().nullish(),
    last_ping_at: z.string().nullish(),
    last_update_at: z.string().nullish(),
  })
  .transform((d) => ({
    bus_id: d.bus_id,
    lat: d.lat,
    lng: d.lng,
    speed_kmh: d.speed_kmh,
    next_stop_name: d.next_stop_name,
    last_ping_at: d.last_ping_at ?? d.last_update_at,
  }));

export type BusPositionPush = z.infer<typeof busPositionPushSchema>;

export function parseBusPositionPush(payload: unknown): BusPositionPush | null {
  const parsed = busPositionPushSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function applyPositionToBusPosition(
  prev: BusPosition | undefined,
  push: BusPositionPush
): BusPosition | undefined {
  if (!prev || prev.busId !== push.bus_id) return prev;
  return {
    ...prev,
    lat: push.lat ?? prev.lat,
    lng: push.lng ?? prev.lng,
    speedKmh: push.speed_kmh ?? prev.speedKmh,
    nextStopName: push.next_stop_name ?? prev.nextStopName,
    lastPingAt: push.last_ping_at ?? prev.lastPingAt,
  };
}

interface PositionRow {
  busId: string;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  nextStopName?: string;
  lastPingAt?: string;
}

export function applyPositionToBusRows<T extends PositionRow>(
  prev: T[] | undefined,
  push: BusPositionPush
): T[] | undefined {
  if (!prev) return prev;
  return prev.map((bus) =>
    bus.busId === push.bus_id
      ? {
          ...bus,
          lat: push.lat ?? bus.lat,
          lng: push.lng ?? bus.lng,
          speedKmh: push.speed_kmh ?? bus.speedKmh,
          nextStopName: push.next_stop_name ?? bus.nextStopName,
          lastPingAt: push.last_ping_at ?? bus.lastPingAt,
        }
      : bus
  );
}

export function applyPositionToFleet(
  prev: FleetBus[] | undefined,
  push: BusPositionPush
): FleetBus[] | undefined {
  return applyPositionToBusRows(prev, push);
}
