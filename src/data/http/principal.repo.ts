import type { PrincipalRepository } from '@/data/repositories/types';
import type { FleetBus, TransportBusRow } from '@/data/domain';
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
  };
}
