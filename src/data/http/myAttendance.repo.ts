import type { MyAttendanceRepository } from '@/data/repositories/types';
import type {
  CheckEvent,
  CheckEventKind,
  SchoolLocation,
  TeacherAttendanceDay,
  TeacherAttendanceSummary,
} from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { deviceUtcOffsetMinutes, todayISO, toDateOnly } from '@/lib/date';

interface SchoolLocationDTO {
  lat: number;
  lng: number;
  radius_meters: number;
  name: string;
}
interface CheckEventDTO {
  kind: CheckEventKind;
  at: string;
  lat: number;
  lng: number;
  accuracy_meters: number;
  distance_meters: number;
  verified: boolean;
  offset_minutes?: number;
}
export interface TeacherAttendanceDayDTO {
  date: string;
  check_in?: CheckEventDTO;
  check_out?: CheckEventDTO;
}
interface TeacherAttendanceSummaryDTO {
  days_present: number;
  days_flagged: number;
  total_hours: number;
}

const toSchool = (d: SchoolLocationDTO): SchoolLocation => ({
  lat: d.lat,
  lng: d.lng,
  radiusMeters: d.radius_meters,
  name: d.name,
});
const toEvent = (d: CheckEventDTO): CheckEvent => ({
  kind: d.kind,
  at: d.at,
  lat: d.lat,
  lng: d.lng,
  accuracyMeters: d.accuracy_meters,
  distanceMeters: d.distance_meters,
  verified: d.verified,
});
export const toDay = (d: TeacherAttendanceDayDTO): TeacherAttendanceDay => ({
  date: toDateOnly(d.date),
  checkIn: d.check_in ? toEvent(d.check_in) : undefined,
  checkOut: d.check_out ? toEvent(d.check_out) : undefined,
});
const toSummary = (d: TeacherAttendanceSummaryDTO): TeacherAttendanceSummary => ({
  daysPresent: d.days_present,
  daysFlagged: d.days_flagged,
  totalHours: d.total_hours,
});
const fromEvent = (e: CheckEvent): CheckEventDTO => ({
  kind: e.kind,
  at: e.at,
  lat: e.lat,
  lng: e.lng,
  accuracy_meters: e.accuracyMeters,
  distance_meters: e.distanceMeters,
  verified: e.verified,
  offset_minutes: deviceUtcOffsetMinutes(),
});

export function httpMyAttendance(http: HttpClient): MyAttendanceRepository {
  return {
    schoolLocation: () =>
      http.get<SchoolLocationDTO>('/me/attendance/school-location').then(toSchool),
    today: () =>
      http
        .get<TeacherAttendanceDayDTO>('/me/attendance/today', {
          params: { date: todayISO(), offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then(toDay),
    history: (limit) =>
      http
        .get<TeacherAttendanceDayDTO[]>('/me/attendance/history', {
          params: { limit, offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then((d) => d.map(toDay)),
    summary: (month) =>
      http
        .get<TeacherAttendanceSummaryDTO>(`/me/attendance/summary`, {
          params: { month, offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then(toSummary),
    punch: (event) =>
      http.post<TeacherAttendanceDayDTO>('/me/attendance/punch', fromEvent(event)).then(toDay),
  };
}
