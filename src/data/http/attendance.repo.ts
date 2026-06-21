import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAttendanceRecord, fromAttendanceStatus, attendanceRecordSchema } from './mappers';

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    forClass: (classId, date) =>
      http
        .get<unknown[]>(`/classes/${classId}/attendance`, { params: { date } })
        .then((d) => d.map((x) => toAttendanceRecord(attendanceRecordSchema.parse(x)))),

    save: (classId, date, records) =>
      http
        .post<void>(`/classes/${classId}/attendance`, {
          date,
          records: records.map((r) => ({
            student_id: r.studentId,
            status: fromAttendanceStatus(r.status),
          })),
        })
        .then(() => undefined),
  };
}
