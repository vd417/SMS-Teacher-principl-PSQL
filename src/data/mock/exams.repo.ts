import type { ExamsRepository, NewExamInput } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

export function mockExams(store: Store): ExamsRepository {
  return {
    async list() {
      await simulateLatency();
      return [...store.tables.exams];
    },

    async get(id) {
      await simulateLatency();
      const found = store.tables.exams.find((e) => e.id === id);
      if (!found) throw new AppError({ code: 'not_found', status: 404, message: 'Exam not found' });
      return found;
    },

    async create(input: NewExamInput) {
      await simulateLatency();
      const cls = store.tables.classes.find((c) => c.id === input.classId);
      const className = cls ? `${cls.name}-${cls.section}` : input.classId;
      const subject = cls?.subject ?? '';
      const exam = {
        id: store.genId('exam'),
        className,
        subject,
        ...input,
      };
      store.tables.exams.unshift(exam);
      await store.persist('exams');
      return exam;
    },

    async update(id, patch) {
      await simulateLatency();
      const idx = store.tables.exams.findIndex((e) => e.id === id);
      if (idx === -1)
        throw new AppError({ code: 'not_found', status: 404, message: 'Exam not found' });
      const existing = store.tables.exams[idx];
      // If classId changes, re-derive className and subject
      let className = existing.className;
      let subject = existing.subject;
      if (patch.classId && patch.classId !== existing.classId) {
        const cls = store.tables.classes.find((c) => c.id === patch.classId);
        if (cls) {
          className = `${cls.name}-${cls.section}`;
          subject = cls.subject;
        }
      }
      const updated = { ...existing, ...patch, className, subject };
      store.tables.exams[idx] = updated;
      await store.persist('exams');
      return updated;
    },

    async remove(id) {
      await simulateLatency();
      const before = store.tables.exams.length;
      store.tables.exams = store.tables.exams.filter((e) => e.id !== id);
      if (store.tables.exams.length === before)
        throw new AppError({ code: 'not_found', status: 404, message: 'Exam not found' });
      await store.persist('exams');
    },
  };
}
