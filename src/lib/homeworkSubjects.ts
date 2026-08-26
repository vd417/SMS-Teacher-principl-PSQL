import type { TimetableSlot } from '@/data/domain';

export function sameTimetableTeacher(
  slotTeacherName: string | null | undefined,
  teacherName: string
): boolean {
  const want = teacherName.trim().toLowerCase();
  if (!want) return false;
  return (slotTeacherName ?? '').trim().toLowerCase() === want;
}

function sameDay(slotDay: string, day: string): boolean {
  const a = slotDay.trim().slice(0, 3).toLowerCase();
  const b = day.trim().slice(0, 3).toLowerCase();
  return a.length === 3 && a === b;
}

/** Keep periods this teacher is assigned on the timetable. No name → no filter (principal). */
export function slotsTaughtByTeacher<T extends { teacherName?: string | null }>(
  slots: T[],
  teacherName?: string | null
): T[] {
  if (teacherName == null || teacherName.trim() === '') return slots;
  return slots.filter((s) => sameTimetableTeacher(s.teacherName, teacherName));
}

function slotsForClass(
  slots: TimetableSlot[],
  classId: string,
  teacherName?: string | null,
  day?: string | null
): TimetableSlot[] {
  let inClass = slots.filter((s) => s.classId === classId);
  if (day != null && day.trim() !== '') {
    inClass = inClass.filter((s) => sameDay(s.day, day));
  }
  return slotsTaughtByTeacher(inClass, teacherName);
}

/** Unique timetable subjects for a class. Pass teacherName to keep only that teacher's subjects. */
export function homeworkSubjectsForClass(
  slots: TimetableSlot[],
  classId: string,
  teacherName?: string | null,
  day?: string | null
): string[] {
  const names = new Set<string>();
  for (const s of slotsForClass(slots, classId, teacherName, day)) {
    const subject = s.subject.trim();
    if (subject) names.add(subject);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function homeworkPeriodsForSubject(
  slots: TimetableSlot[],
  classId: string,
  subject: string,
  teacherName?: string | null,
  day?: string | null
): number[] {
  const want = subject.trim().toLowerCase();
  const periods = new Set<number>();
  for (const s of slotsForClass(slots, classId, teacherName, day)) {
    if (s.subject.trim().toLowerCase() === want) periods.add(s.period);
  }
  return [...periods].sort((a, b) => a - b);
}
