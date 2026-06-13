import type { ExamsRepository, NewExamInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toExam, toExamDTO, type ExamPaperDTO } from './mappers';

export function httpExams(http: HttpClient): ExamsRepository {
  return {
    list: () => http.get<ExamPaperDTO[]>('/exam-papers').then((d) => d.map(toExam)),
    get: (id) => http.get<ExamPaperDTO>(`/exam-papers/${id}`).then(toExam),
    create: (input: NewExamInput) =>
      http
        .post<ExamPaperDTO>(
          '/exam-papers',
          toExamDTO({ ...input, classId: input.classId, maxMarks: input.maxMarks })
        )
        .then(toExam),
    update: (id, patch) =>
      http
        .patch<ExamPaperDTO>(
          `/exam-papers/${id}`,
          toExamDTO({ ...patch, classId: patch.classId, maxMarks: patch.maxMarks })
        )
        .then(toExam),
    remove: (id) => http.delete(`/exam-papers/${id}`),
  };
}
