import type { Class, TimetableSlot } from '@/data/domain';
import { homeworkSubjectsForClass } from './homeworkSubjects';

/**
 * The subject(s) the signed-in teacher teaches in `cls`, derived from her own
 * timetable slots — not the class-level `Classes.Subject` column, which is a
 * single stored value shared by every teacher who touches the class.
 * Falls back to the class-level subject when the teacher has no matching
 * slots (for example a principal, who is not filtered by name).
 */
export function classSubjectForTeacher(
  cls: Pick<Class, 'id' | 'subject'>,
  timetable: TimetableSlot[],
  teacherName?: string | null
): string {
  const subjects = homeworkSubjectsForClass(timetable, cls.id, teacherName);
  return subjects.length > 0 ? subjects.join(', ') : cls.subject;
}
