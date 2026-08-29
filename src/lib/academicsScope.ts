import type { Class, TimetableSlot } from '@/data/domain';

/** Classes linked to a teacher: homeroom assignment + timetable slots by name. */
export function classIdsForTeacher(
  teacherId: string,
  teacherName: string,
  classes: Class[],
  timetable: TimetableSlot[]
): Set<string> {
  const ids = new Set<string>();
  const norm = teacherName.trim().toLowerCase();

  for (const c of classes) {
    if (c.classTeacherId && c.classTeacherId === teacherId) ids.add(c.id);
  }

  for (const slot of timetable) {
    if (!slot.classId) continue;
    if (slot.teacherName.trim().toLowerCase() === norm) ids.add(slot.classId);
  }

  return ids;
}

export function homeroomTeacherName(
  classId: string,
  classes: Class[],
  teachersById: Map<string, string>
): string {
  const cls = classes.find((c) => c.id === classId);
  if (!cls?.classTeacherId) return '';
  return teachersById.get(cls.classTeacherId) ?? '';
}

export function teacherNameMap(members: { id: string; name: string }[]): Map<string, string> {
  return new Map(members.map((m) => [m.id, m.name]));
}
