import type { GradesRepository, GradeInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toGrade, type GradeDTO } from './mappers';

export function httpGrades(http: HttpClient): GradesRepository {
  return {
    listByExam: (examId) =>
      http.get<GradeDTO[]>(`/exam-papers/${examId}/grades`).then((d) => d.map(toGrade)),
    upsert: (input: GradeInput) =>
      http
        .put<GradeDTO>('/grades', {
          student_id: input.studentId,
          exam_paper_id: input.examId,
          marks: input.marks,
        })
        .then(toGrade),
  };
}
