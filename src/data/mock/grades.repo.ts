import type { GradesRepository, GradeInput } from '@/data/repositories/types';
import type { GradeEntry } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

function letterFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  return 'D';
}

export function mockGrades(store: Store): GradesRepository {
  return {
    async listByExam(examId) {
      await simulateLatency();
      return store.tables.grades.filter((g) => g.examId === examId);
    },

    async upsert(input: GradeInput) {
      await simulateLatency();
      const exam = store.tables.exams.find((e) => e.id === input.examId);
      if (!exam) throw new AppError({ code: 'not_found', status: 404, message: 'Exam not found' });
      const maxMarks = exam.maxMarks;
      const pct = (input.marks / maxMarks) * 100;
      const grade = letterFor(pct);

      const existingIdx = store.tables.grades.findIndex(
        (g) => g.studentId === input.studentId && g.examId === input.examId
      );

      if (existingIdx !== -1) {
        const existing = store.tables.grades[existingIdx];
        const updated: GradeEntry = {
          ...existing,
          marks: input.marks,
          maxMarks,
          grade,
        };
        store.tables.grades[existingIdx] = updated;
        await store.persist('grades');
        return updated;
      }

      // New entry - look up student name
      const student = store.tables.students.find((s) => s.id === input.studentId);
      if (!student)
        throw new AppError({ code: 'not_found', status: 404, message: 'Student not found' });

      const newEntry: GradeEntry = {
        studentId: input.studentId,
        studentName: student.name,
        examId: input.examId,
        marks: input.marks,
        maxMarks,
        grade,
      };
      store.tables.grades.push(newEntry);
      await store.persist('grades');
      return newEntry;
    },
  };
}
