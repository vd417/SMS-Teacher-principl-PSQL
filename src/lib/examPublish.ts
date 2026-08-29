import type { Exam, ExamTerm } from '@/data/domain';

export function publishedExamTermIds(terms: ExamTerm[]): Set<string> {
  return new Set(terms.filter((t) => t.published).map((t) => t.id));
}

/** Teacher/principal class test — not attached to a CRM exam term. */
export function isClassTest(paper: Pick<Exam, 'examTermId'>): boolean {
  return !paper.examTermId;
}

/** Papers on unpublished exam terms (or draft papers) stay hidden in teacher/principal apps. */
export function filterPublishedExamPapers(papers: Exam[], publishedIds: Set<string>): Exam[] {
  return papers.filter((paper) => {
    if (paper.status === 'draft') return false;
    if (isClassTest(paper)) return true;
    return publishedIds.has(paper.examTermId!);
  });
}
