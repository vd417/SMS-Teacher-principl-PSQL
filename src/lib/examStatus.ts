import type { ExamStatus } from '@/data/domain';

/** CRM / backend paper statuses → teacher app vocabulary. */
export function mapExamPaperStatus(raw: string): ExamStatus {
  switch (raw) {
    case 'completed':
      return 'completed';
    case 'draft':
      return 'draft';
    case 'upcoming':
      return 'upcoming';
    case 'scheduled':
    case 'marks_entry':
      return 'upcoming';
    default:
      return 'upcoming';
  }
}
