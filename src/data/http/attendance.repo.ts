import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { z } from 'zod';
import { toAttendanceRecord, fromAttendanceStatus, attendanceRecordSchema } from './mappers';

const rollCallSchema = z.object({
  can_mark: z.boolean(),
  period: z.number().nullable(),
  subject: z.string().nullable(),
  teacher_name: z.string().nullable(),
  reason: z.string(),
  marked: z.boolean(),
});

const daySlotSchema = z.object({
  id: z.string(),
  period: z.number(),
  subject: z.string().nullable().optional(),
  subject_id: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  teacher_id: z.string().nullable().optional(),
  teacher_name: z.string().nullable().optional(),
  is_current: z.boolean(),
  marked: z.boolean(),
  can_mark: z.boolean(),
});

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    forClass: (classId, date) =>
      http
        .get<unknown[]>(`/classes/${classId}/attendance`, { params: { date } })
        .then((d) =>
          (Array.isArray(d) ? d : []).map((x) =>
            toAttendanceRecord(attendanceRecordSchema.parse(x))
          )
        ),

    rollCall: (classId, date) =>
      http
        .get<unknown>(`/classes/${classId}/attendance/roll-call`, { params: { date } })
        .then((data) => {
          const row = rollCallSchema.parse(data);
          return {
            canMark: row.can_mark,
            period: row.period,
            subject: row.subject,
            teacherName: row.teacher_name,
            reason: row.reason,
            marked: row.marked,
          };
        }),

    dayTimetable: (classId, date) =>
      http.get<unknown[]>(`/classes/${classId}/timetable/day`, { params: { date } }).then((d) =>
        (Array.isArray(d) ? d : []).map((x) => {
          const row = daySlotSchema.parse(x);
          return {
            id: row.id,
            period: row.period,
            subject: row.subject ?? null,
            subjectId: row.subject_id ?? null,
            startTime: row.start_time ?? null,
            endTime: row.end_time ?? null,
            teacherId: row.teacher_id ?? null,
            teacherName: row.teacher_name ?? null,
            isCurrent: row.is_current,
            marked: row.marked,
            canMark: row.can_mark,
          };
        })
      ),

    forPeriod: (classId, date, period, subject) =>
      http
        .get<unknown[]>(`/classes/${classId}/attendance/periods`, {
          params: { date, period, subject },
        })
        .then((d) =>
          (Array.isArray(d) ? d : []).map((x) =>
            toAttendanceRecord(attendanceRecordSchema.parse(x))
          )
        ),

    save: (classId, date, records) => {
      const rows = records
        .filter((r) => r.studentId.trim() !== '')
        .map((r) => ({
          student_id: r.studentId,
          status: fromAttendanceStatus(r.status),
        }));
      if (rows.length === 0) {
        return Promise.reject(new Error('No students to save'));
      }
      return http
        .post<void>(`/classes/${classId}/attendance`, { date, records: rows })
        .then(() => undefined);
    },

    savePeriod: (classId, args) => {
      const rows = args.records
        .filter((r) => r.studentId.trim() !== '')
        .map((r) => ({
          student_id: r.studentId,
          status: fromAttendanceStatus(r.status),
        }));
      if (rows.length === 0) {
        return Promise.reject(new Error('No students to save'));
      }
      return http
        .post<void>(`/classes/${classId}/attendance/periods`, {
          date: args.date,
          period: args.period,
          subject: args.subject,
          subject_id: args.subjectId ?? null,
          period_id: args.periodId ?? null,
          records: rows,
        })
        .then(() => undefined);
    },
  };
}
