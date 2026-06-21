import type { GradesRepository, GradeInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toGrade, gradeSchema } from './mappers';

export function httpGrades(http: HttpClient): GradesRepository {
  return {
    listByExam: (examId) =>
      http
        .get<unknown[]>(`/exam-papers/${examId}/grades`)
        .then((d) => d.map((x) => toGrade(gradeSchema.parse(x)))),
    upsert: (input: GradeInput) =>
      http
        .put('/grades', {
          student_id: input.studentId,
          exam_paper_id: input.examId,
          marks: input.marks,
        })
        .then((x) => toGrade(gradeSchema.parse(x))),
  };
}
