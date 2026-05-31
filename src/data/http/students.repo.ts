import type { StudentsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toStudent, type StudentDTO } from './mappers';

export function httpStudents(http: HttpClient): StudentsRepository {
  return {
    listByClass: (classId) =>
      http.get<StudentDTO[]>(`/classes/${classId}/students`).then((d) => d.map(toStudent)),
    get: (id) => http.get<StudentDTO>(`/students/${id}`).then(toStudent),
  };
}
