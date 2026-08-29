import type { AnnouncementType } from '@/data/domain';

/** CRM announcement types → teacher app pill/icon vocabulary. */
export function mapAnnouncementType(raw: string): AnnouncementType {
  const key = raw.trim().toLowerCase();
  switch (key) {
    case 'urgent':
    case 'attendance':
    case 'attendance_alert':
      return 'urgent';
    case 'warning':
    case 'fee_reminder':
      return 'warning';
    case 'event':
    case 'calendar':
    case 'holiday':
    case 'exam':
      return 'event';
    case 'info':
    case 'general':
    case 'exam_datesheet':
    case 'fee_receipt':
      return 'info';
    default:
      if (key.includes('calendar') || key.includes('holiday') || key.includes('exam'))
        return 'event';
      if (key.includes('attendance') || key.includes('urgent')) return 'urgent';
      if (key.includes('fee') && key.includes('remind')) return 'warning';
      return 'info';
  }
}
