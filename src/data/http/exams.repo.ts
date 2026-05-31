import type { ExamsRepository, NewExamInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toExam, toExamDTO, type ExamDTO } from './mappers';

export function httpExams(http: HttpClient): ExamsRepository {
  return {
    list: () => http.get<ExamDTO[]>('/exams').then((d) => d.map(toExam)),
    get: (id) => http.get<ExamDTO>(`/exams/${id}`).then(toExam),
    create: (input: NewExamInput) =>
      http
        .post<ExamDTO>(
          '/exams',
          toExamDTO({ ...input, classId: input.classId, maxMarks: input.maxMarks })
        )
        .then(toExam),
    update: (id, patch) =>
      http
        .patch<ExamDTO>(
          `/exams/${id}`,
          toExamDTO({ ...patch, classId: patch.classId, maxMarks: patch.maxMarks })
        )
        .then(toExam),
    remove: (id) => http.delete(`/exams/${id}`),
  };
}
