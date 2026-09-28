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
        .then((x) => toExam(examPaperSchema.parse(x)))
        .then(async (created) => {
          // A-3 (EXM-04): CreateExamPaperRequest has no `status` field, so the
          // API silently drops it and always saves the paper as `upcoming`.
          // Send a follow-up PATCH when a non-default status was requested.
          if (input.status !== 'upcoming' && input.status !== created.status) {
            const patched = await http.patch(`/exam-papers/${created.id}`, {
              status: input.status,
            });
            return toExam(examPaperSchema.parse(patched));
          }
          return created;
        }),
    update: (id, patch) =>
      http
        // A-4 (EXM-05): UpdateExamPaperRequest has no `class_id` field, so a
        // class change on edit is silently dropped. Never send it.
        .patch(
          `/exam-papers/${id}`,
          toExamDTO({ ...patch, classId: undefined, maxMarks: patch.maxMarks })
        )
        .then((x) => toExam(examPaperSchema.parse(x))),
    remove: (id) => http.delete(`/exam-papers/${id}`),
  };
}
