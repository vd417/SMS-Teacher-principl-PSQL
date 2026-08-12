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
  };
}
