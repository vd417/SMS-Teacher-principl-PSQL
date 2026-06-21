import type { ExamsRepository, NewExamInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toExam, toExamDTO, examPaperSchema } from './mappers';

export function httpExams(http: HttpClient): ExamsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/exam-papers')
        .then((d) => d.map((x) => toExam(examPaperSchema.parse(x)))),
    get: (id) => http.get(`/exam-papers/${id}`).then((x) => toExam(examPaperSchema.parse(x))),
    create: (input: NewExamInput) =>
      http
        .post(
          '/exam-papers',
          toExamDTO({ ...input, classId: input.classId, maxMarks: input.maxMarks })
        )
        .then((x) => toExam(examPaperSchema.parse(x))),
    update: (id, patch) =>
      http
        .patch(
          `/exam-papers/${id}`,
          toExamDTO({ ...patch, classId: patch.classId, maxMarks: patch.maxMarks })
        )
        .then((x) => toExam(examPaperSchema.parse(x))),
    remove: (id) => http.delete(`/exam-papers/${id}`),
  };
}
