import { z } from 'zod';
import type { BusRepository } from '@/data/repositories/types';
import type { Bus, BusPosition, BoardingRecord, MyRouteBus } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';

// A-8: these repos had no zod schema, only TypeScript casts, so a shape that
// legitimately differs from the cast (e.g. a null the app assumed non-null)
// passed through silently instead of failing loudly at the boundary.

const busStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Always null for a routed bus — RouteStops has no Time column (SD-3).
  time: z.string().nullable(),
  seq: z.number(),
  lat: z.number(),
  lng: z.number(),
});

const busSchema = z.object({
  id: z.string(),
  bus_no: z.string(),
  // Added by B-4 (backend). Nullish so an older/unrouted response still parses.
  route_id: z.string().nullish(),
  route_name: z.string().nullish(),
  driver: z.string().nullish(),
  driver_phone: z.string().nullish(),
  stops: z.array(busStopSchema).default([]),
});
export type BusDTO = z.infer<typeof busSchema>;

const busPositionSchema = z.object({
  bus_id: z.string(),
  current_stop_index: z.number(),
  progress: z.number(),
  // Null with no live trip.
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  speed_kmh: z.number().nullish(),
  next_stop_name: z.string().nullable(),
  eta_minutes: z.number().nullable(),
  last_ping_at: z.string().nullish(),
});

// Boardings.State is free text; the driver/staff app also writes 'dropped'
// (TripService.ValidBoardingStates). Approved at CHECKPOINT 2: map it to the
// app's 'boarded'.
const boardingRecordSchema = z.object({
  student_id: z.string(),
  student_name: z.string(),
  initials: z.string(),
  stop_id: z.string(),
  status: z.enum(['pending', 'boarded', 'absent', 'dropped']),
});

// Shape returned by GET /bus/traveling — same as BusDTO (this teacher's traveling-teacher
// buses), one row per bus they've been added to. No live position fields: those arrive via
// the TransportFleetHub push once useTransportFleetPush joins each busId's group below.

export const toBus = (d: BusDTO): Bus => ({
  id: d.id,
  number: d.bus_no,
  routeName: d.route_name ?? '',
  driver: d.driver ?? '',
  driverPhone: d.driver_phone ?? '',
  stops: d.stops.map((s) => ({
    id: s.id,
    name: s.name,
    time: s.time,
    order: s.seq,
    lat: s.lat,
    lng: s.lng,
  })),
  ...(d.route_id ? { routeId: d.route_id } : {}),
});
const toPosition = (d: z.infer<typeof busPositionSchema>): BusPosition => ({
  busId: d.bus_id,
  currentStopIndex: d.current_stop_index,
  progress: d.progress,
  lat: d.lat ?? undefined,
  lng: d.lng ?? undefined,
  speedKmh: d.speed_kmh ?? undefined,
  nextStopName: d.next_stop_name ?? undefined,
  etaMinutes: d.eta_minutes ?? undefined,
  lastPingAt: d.last_ping_at ?? undefined,
});
const toRecord = (d: z.infer<typeof boardingRecordSchema>): BoardingRecord => ({
  studentId: d.student_id,
  studentName: d.student_name,
  initials: d.initials,
  stopId: d.stop_id,
  status: d.status === 'dropped' ? 'boarded' : d.status,
});
const toMyRouteBus = (d: BusDTO): MyRouteBus => ({
  busId: d.id,
  busNo: d.bus_no,
  routeName: d.route_name ?? undefined,
  isDutyTeacher: false,
  ...(d.route_id ? { routeId: d.route_id } : {}),
});

export function httpBus(http: HttpClient): BusRepository {
  return {
    assignedBus: () => http.get<unknown>('/bus/assigned').then((d) => toBus(busSchema.parse(d))),
    position: (busId) =>
      http
        .get<unknown>(`/bus/${busId}/position`)
        .then((d) => toPosition(busPositionSchema.parse(d))),
    roster: (busId) =>
      http
        .get<unknown[]>(`/bus/${busId}/roster`)
        .then((d) => d.map((x) => toRecord(boardingRecordSchema.parse(x)))),
    saveBoarding: (busId, records) =>
      http
        .post<void>(`/bus/${busId}/boarding`, {
          records: records.map((r) => ({
            student_id: r.studentId,
            student_name: r.studentName,
            initials: r.initials,
            stop_id: r.stopId,
            status: r.status,
          })),
        })
        .then(() => undefined),
    // Buses this teacher has been added to as a "traveling teacher" — a many-to-many
    // live-view grant distinct from the single Bus Duty escort (assignedBus above).
    myRoutes: () =>
      http
        .get<unknown[]>('/bus/traveling')
        .then((rows) => rows.map((x) => toMyRouteBus(busSchema.parse(x)))),
  };
}
