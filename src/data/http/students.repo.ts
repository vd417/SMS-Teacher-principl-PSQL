import type { StudentsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toStudent, studentSchema } from './mappers';

export function httpStudents(http: HttpClient): StudentsRepository {
  return {
    // The roster endpoint carries the class in the path; inject it into each row.
    // It is cursor-paginated, so we pass limit/cursor and return a Page.
    listByClass: (classId, page) =>
      http
        .getList<unknown>(`/classes/${classId}/students`, {
          params: { limit: page?.limit, cursor: page?.cursor },
        })
        .then((p) => ({
          items: p.items.map((x) => toStudent(studentSchema.parse(x), classId)),
          nextCursor: p.nextCursor,
        })),
    get: (id) => http.get(`/students/${id}`).then((x) => toStudent(studentSchema.parse(x))),
    updatePhoto: (studentId, photoUrl) =>
      http
        .patch(`/students/${studentId}`, { photo_url: photoUrl, set_photo: true })
        .then((x) => toStudent(studentSchema.parse(x))),
  };
}
