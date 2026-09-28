import { z } from 'zod';
import type { MyAttendanceRepository } from '@/data/repositories/types';
import type {
  CheckEvent,
  SchoolLocation,
  TeacherAttendanceDay,
  TeacherAttendanceSummary,
} from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { deviceUtcOffsetMinutes, todayISO, toDateOnly } from '@/lib/date';

// A-8: these repos had no zod schema, only TypeScript casts.

const schoolLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius_meters: z.number(),
  name: z.string().nullish(),
});
const checkEventSchema = z.object({
  kind: z.enum(['in', 'out']),
  at: z.string(),
  lat: z.number(),
  lng: z.number(),
  accuracy_meters: z.number(),
  distance_meters: z.number(),
  verified: z.boolean(),
  offset_minutes: z.number().nullish(),
});
export const teacherAttendanceDaySchema = z.object({
  date: z.string(),
  check_in: checkEventSchema.nullish(),
  check_out: checkEventSchema.nullish(),
});
export type TeacherAttendanceDayDTO = z.infer<typeof teacherAttendanceDaySchema>;
const teacherAttendanceSummarySchema = z.object({
  days_present: z.number(),
  days_flagged: z.number(),
  total_hours: z.number(),
});

const toSchool = (d: z.infer<typeof schoolLocationSchema>): SchoolLocation => ({
  lat: d.lat,
  lng: d.lng,
  radiusMeters: d.radius_meters,
  name: d.name ?? '',
});
const toEvent = (d: z.infer<typeof checkEventSchema>): CheckEvent => ({
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
const toSummary = (
  d: z.infer<typeof teacherAttendanceSummarySchema>
): TeacherAttendanceSummary => ({
  daysPresent: d.days_present,
  daysFlagged: d.days_flagged,
  totalHours: d.total_hours,
});
const fromEvent = (e: CheckEvent): z.infer<typeof checkEventSchema> => ({
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
      http
        .get<unknown>('/me/attendance/school-location')
        .then((d) => toSchool(schoolLocationSchema.parse(d))),
    today: () =>
      http
        .get<unknown>('/me/attendance/today', {
          params: { date: todayISO(), offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then((d) => toDay(teacherAttendanceDaySchema.parse(d))),
    history: (limit) =>
      http
        .get<unknown[]>('/me/attendance/history', {
          params: { limit, offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then((d) => d.map((x) => toDay(teacherAttendanceDaySchema.parse(x)))),
    summary: (month) =>
      http
        .get<unknown>(`/me/attendance/summary`, {
          params: { month, offset_minutes: deviceUtcOffsetMinutes() },
        })
        .then((d) => toSummary(teacherAttendanceSummarySchema.parse(d))),
    punch: (event) =>
      http
        .post<unknown>('/me/attendance/punch', fromEvent(event))
        .then((d) => toDay(teacherAttendanceDaySchema.parse(d))),
  };
}
