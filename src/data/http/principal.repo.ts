import type { PrincipalRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { deviceUtcOffsetMinutes } from '@/lib/date';
import {
  fleetBusSchema,
  toFleetBus,
  transportBusSchema,
  toTransportBusRow,
} from './transport.mappers';
import {
  toPrincipalOverview,
  principalOverviewSchema,
  toSchoolAttendance,
  schoolAttendanceSchema,
} from './mappers';
import { toDay, type TeacherAttendanceDayDTO } from './myAttendance.repo';

export function httpPrincipal(http: HttpClient): PrincipalRepository {
  const offsetParams = () => ({ offset_minutes: deviceUtcOffsetMinutes() });

  return {
    overview: () =>
      http
        .get('/principal/overview', { params: offsetParams() })
        .then((x) => toPrincipalOverview(principalOverviewSchema.parse(x))),
    attendance: (date) =>
      http
        .get('/principal/attendance', { params: { date, ...offsetParams() } })
        .then((x) => toSchoolAttendance(schoolAttendanceSchema.parse(x))),
    staffAttendanceHistory: (personId, limit) =>
      http
        .get<TeacherAttendanceDayDTO[]>(`/principal/staff/${personId}/attendance/history`, {
          params: { limit, ...offsetParams() },
        })
        .then((rows) => rows.map(toDay)),
    transportFleet: () =>
      http
        .get<unknown[]>('/transport/fleet')
        .then((rows) => rows.map((r) => toFleetBus(fleetBusSchema.parse(r)))),
    listTransportBuses: () =>
      http
        .get<unknown[]>('/transport/buses')
        .then((rows) => rows.map((r) => toTransportBusRow(transportBusSchema.parse(r)))),
    assignBusTeacher: (busId, teacherUserId) =>
      http
        .put(`/transport/buses/${busId}/teacher`, { teacher_user_id: teacherUserId })
        .then(() => undefined),
    unassignBusTeacher: (busId) =>
      http.delete(`/transport/buses/${busId}/teacher`).then(() => undefined),
    // Many-to-many live-view grant, distinct from the single Bus Duty escort
    // (assignBusTeacher above) — any number of teachers can be added per bus.
    addTravelingTeacher: (busId, teacherUserId) =>
      http
        .put(`/transport/buses/${busId}/traveling-teachers/${teacherUserId}`)
        .then(() => undefined),
    removeTravelingTeacher: (busId, teacherUserId) =>
      http
        .delete(`/transport/buses/${busId}/traveling-teachers/${teacherUserId}`)
        .then(() => undefined),
  };
}
