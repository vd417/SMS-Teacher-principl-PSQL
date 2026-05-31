import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAttendanceRecord, type AttendanceRecordDTO } from './mappers';

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    forClass: (classId, date) =>
      http
        .get<AttendanceRecordDTO[]>(`/classes/${classId}/attendance?date=${date}`)
        .then((d) => d.map(toAttendanceRecord)),

    save: (classId, date, records) =>
      http
        .post<void>(`/classes/${classId}/attendance`, {
          date,
          records: records.map((r) => ({
            student_id: r.studentId,
            status: r.status,
            date: r.date,
          })),
        })
        .then(() => undefined),
  };
}
