import type { StudentsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toStudent, studentSchema } from './mappers';

export function httpStudents(http: HttpClient): StudentsRepository {
  return {
    // The roster endpoint carries the class in the path; inject it into each row.
    listByClass: (classId) =>
      http
        .get<unknown[]>(`/classes/${classId}/students`)
        .then((d) => d.map((x) => toStudent(studentSchema.parse(x), classId))),
    get: (id) => http.get(`/students/${id}`).then((x) => toStudent(studentSchema.parse(x))),
  };
}
