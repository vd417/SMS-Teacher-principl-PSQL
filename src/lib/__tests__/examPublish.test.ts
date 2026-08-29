import { filterPublishedExamPapers, isClassTest, publishedExamTermIds } from '../examPublish';
import type { Exam, ExamTerm } from '@/data/domain';

function paper(id: string, extra: Partial<Exam> = {}): Exam {
  return {
    id,
    title: id,
    classId: 'c1',
    className: '',
    subject: 'Math',
    date: '2026-07-01',
    time: '09:00',
    duration: 45,
    maxMarks: 20,
    topics: [],
    status: 'upcoming',
    ...extra,
  };
}

const terms: ExamTerm[] = [
  { id: 'term-1', name: 'Mid-term', published: true },
  { id: 'term-2', name: 'Final', published: false },
];

test('isClassTest is a paper with no CRM exam term', () => {
  expect(isClassTest(paper('t1'))).toBe(true);
  expect(isClassTest(paper('e1', { examTermId: 'term-1' }))).toBe(false);
});

test('publishedExamTermIds collects published term ids', () => {
  expect([...publishedExamTermIds(terms)]).toEqual(['term-1']);
});

test('filterPublishedExamPapers shows class tests and published CRM papers only', () => {
  const published = publishedExamTermIds(terms);
  const visible = filterPublishedExamPapers(
    [
      paper('p1', { examTermId: 'term-1' }),
      paper('p2', { examTermId: 'term-2' }),
      paper('p3', { status: 'draft', examTermId: 'term-1' }),
      paper('class-test'),
    ],
    published
  );
  expect(visible.map((p) => p.id)).toEqual(['p1', 'class-test']);
});
