import type { BusRepository } from '@/data/repositories/types';
import type { Bus, BusPosition, BoardingRecord, BoardingStatus, MyRouteBus } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';

export interface BusStopDTO {
  id: string;
  name: string;
  time: string;
  seq: number;
  lat: number;
  lng: number;
}
export interface BusDTO {
  id: string;
  bus_no: string;
  route_name: string;
  driver: string;
  driver_phone: string;
  stops: BusStopDTO[];
}
interface BusPositionDTO {
  bus_id: string;
  current_stop_index: number;
  progress: number;
  lat: number;
  lng: number;
  speed_kmh?: number | null;
  next_stop_name: string;
  eta_minutes: number;
  last_ping_at?: string | null;
}
interface BoardingRecordDTO {
  student_id: string;
  student_name: string;
  initials: string;
  stop_id: string;
  status: BoardingStatus;
}
// Shape returned by GET /bus/traveling — same as BusDTO (this teacher's traveling-teacher
// buses), one row per bus they've been added to. No live position fields: those arrive via
// the TransportFleetHub push once useTransportFleetPush joins each busId's group below.
type TravelingBusDTO = BusDTO;

export const toBus = (d: BusDTO): Bus => ({
  id: d.id,
  number: d.bus_no,
  routeName: d.route_name,
  driver: d.driver,
  driverPhone: d.driver_phone,
  stops: d.stops.map((s) => ({
    id: s.id,
    name: s.name,
    time: s.time,
    order: s.seq,
    lat: s.lat,
    lng: s.lng,
  })),
});
const toPosition = (d: BusPositionDTO): BusPosition => ({
  busId: d.bus_id,
  currentStopIndex: d.current_stop_index,
  progress: d.progress,
  lat: d.lat,
  lng: d.lng,
  speedKmh: d.speed_kmh ?? undefined,
  nextStopName: d.next_stop_name,
  etaMinutes: d.eta_minutes,
  lastPingAt: d.last_ping_at ?? undefined,
});
const toRecord = (d: BoardingRecordDTO): BoardingRecord => ({
  studentId: d.student_id,
  studentName: d.student_name,
  initials: d.initials,
  stopId: d.stop_id,
  status: d.status,
});
const toMyRouteBus = (d: TravelingBusDTO): MyRouteBus => ({
  busId: d.id,
  busNo: d.bus_no,
  routeName: d.route_name ?? undefined,
  isDutyTeacher: false,
});

export function httpBus(http: HttpClient): BusRepository {
  return {
    assignedBus: () => http.get<BusDTO>('/bus/assigned').then(toBus),
    position: (busId) => http.get<BusPositionDTO>(`/bus/${busId}/position`).then(toPosition),
    roster: (busId) =>
      http.get<BoardingRecordDTO[]>(`/bus/${busId}/roster`).then((d) => d.map(toRecord)),
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
      http.get<TravelingBusDTO[]>('/bus/traveling').then((rows) => rows.map(toMyRouteBus)),
  };
}
