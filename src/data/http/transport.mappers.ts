import { z } from 'zod';
import type { BusStop, FleetBus, FleetBusStatus, TransportBusRow } from '@/data/domain';

const fleetStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  time: z.string().nullish(),
  seq: z.number(),
  lat: z.number(),
  lng: z.number(),
});

export const fleetBusSchema = z.object({
  bus_id: z.string(),
  bus_no: z.string(),
  // A-7: /transport/fleet already sends this; the schema used to strip it.
  route_id: z.string().nullish(),
  route_name: z.string().nullish(),
  driver: z.string().nullish(),
  driver_phone: z.string().nullish(),
  stop_count: z.number().nullish(),
  students_riding: z.number().nullish(),
  status: z.string(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  speed_kmh: z.number().nullish(),
  next_stop_name: z.string().nullish(),
  last_ping_at: z.string().nullish(),
  teacher_user_id: z.string().nullish(),
  teacher_name: z.string().nullish(),
  conductor_staff_id: z.string().nullish(),
  traveling_teachers: z
    .array(z.object({ teacher_user_id: z.string(), teacher_name: z.string() }))
    .nullish(),
  stops: z.array(fleetStopSchema).nullish(),
});

export const transportBusSchema = z.object({
  bus_id: z.string(),
  bus_no: z.string(),
  // A-7: /transport/buses already sends this; the schema used to strip it.
  route_id: z.string().nullish(),
  route_name: z.string().nullish(),
  driver: z.string().nullish(),
  driver_phone: z.string().nullish(),
  stop_count: z.number().nullish(),
  students_assigned: z.number().nullish(),
  teacher_user_id: z.string().nullish(),
  teacher_name: z.string().nullish(),
});

function normalizeFleetStatus(raw: string): FleetBusStatus {
  const s = raw.toLowerCase();
  if (s === 'on_route' || s === 'at_stop' || s === 'delayed' || s === 'idle') return s;
  return 'idle';
}

export const toFleetBus = (d: z.infer<typeof fleetBusSchema>): FleetBus => ({
  busId: d.bus_id,
  busNo: d.bus_no,
  routeId: d.route_id ?? undefined,
  routeName: d.route_name ?? undefined,
  driver: d.driver ?? undefined,
  driverPhone: d.driver_phone ?? undefined,
  stopCount: d.stop_count ?? 0,
  studentsRiding: d.students_riding ?? 0,
  status: normalizeFleetStatus(d.status),
  lat: d.lat ?? undefined,
  lng: d.lng ?? undefined,
  speedKmh: d.speed_kmh ?? undefined,
  nextStopName: d.next_stop_name ?? undefined,
  lastPingAt: d.last_ping_at ?? undefined,
  teacherUserId: d.teacher_user_id ?? undefined,
  teacherName: d.teacher_name ?? undefined,
  conductorStaffId: d.conductor_staff_id ?? undefined,
  travelingTeachers: d.traveling_teachers?.map((t) => ({
    teacherUserId: t.teacher_user_id,
    teacherName: t.teacher_name,
  })),
  stops: d.stops?.map(
    (s): BusStop => ({
      id: s.id,
      name: s.name,
      time: s.time ?? '',
      order: s.seq,
      lat: s.lat,
      lng: s.lng,
    })
  ),
});

export const toTransportBusRow = (d: z.infer<typeof transportBusSchema>): TransportBusRow => ({
  busId: d.bus_id,
  busNo: d.bus_no,
  routeId: d.route_id ?? undefined,
  routeName: d.route_name ?? undefined,
  driver: d.driver ?? undefined,
  driverPhone: d.driver_phone ?? undefined,
  stopCount: d.stop_count ?? 0,
  studentsAssigned: d.students_assigned ?? 0,
  teacherUserId: d.teacher_user_id ?? undefined,
  teacherName: d.teacher_name ?? undefined,
});
