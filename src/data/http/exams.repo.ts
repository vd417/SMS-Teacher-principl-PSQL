import type { ExamsRepository, NewExamInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toExam, toExamDTO, toExamTerm, examPaperSchema, examTermSchema } from './mappers';

export function httpExams(http: HttpClient): ExamsRepository {
  return {
    listTerms: () =>
      http.get<unknown[]>('/exams').then((d) => d.map((x) => toExamTerm(examTermSchema.parse(x)))),
    list: () =>
      http
        .get<unknown[]>('/exam-papers')
        .then((d) => d.map((x) => toExam(examPaperSchema.parse(x)))),
    get: (id) => http.get(`/exam-papers/${id}`).then((x) => toExam(examPaperSchema.parse(x))),
    create: (input: NewExamInput) =>
      http
        .post(
          '/exam-papers',
          toExamDTO({
            title: input.title,
            subject: input.subject,
            classId: input.classId,
            date: input.date,
            time: input.time,
            duration: input.duration,
            maxMarks: input.maxMarks,
            topics: input.topics,
            status: input.status,
          })
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
