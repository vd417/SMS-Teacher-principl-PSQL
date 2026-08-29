import type { Class, Role, TimetableSlot } from '@/data/domain';
import { classLabel } from '@/lib/classLabel';

function homeroomClassIds(classes: Class[], homeroomLabel?: string): Set<string> {
  const label = homeroomLabel?.trim();
  if (!label) return new Set();

  const ids = new Set<string>();
  for (const c of classes) {
    if (
      c.name === label ||
      classLabel(c.name, c.section, ' – ') === label ||
      classLabel(c.name, c.section, ' ') === label ||
      classLabel(c.name, c.section, '-') === label
    ) {
      ids.add(c.id);
    }
  }
  return ids;
}

/** Class ids this teacher is linked to via timetable slots and/or homeroom profile. */
export function assignedClassIdsForTeacher(
  classes: Class[],
  timetable: TimetableSlot[],
  homeroomLabel?: string
): Set<string> {
  const ids = new Set<string>();
  for (const slot of timetable) {
    if (slot.classId) ids.add(slot.classId);
  }
  for (const id of homeroomClassIds(classes, homeroomLabel)) {
    ids.add(id);
  }
  return ids;
}

/**
 * Principals see every class. Teachers see classes assigned to them — the API
 * already scopes GET /classes for teacher-only tokens; this also narrows an
 * unscoped list using timetable + homeroom linkage when available.
 */
export function classesForRole(
  classes: Class[],
  role: Role,
  opts?: { timetable?: TimetableSlot[]; homeroomLabel?: string }
): Class[] {
  if (role === 'principal') return classes;

  const assigned = assignedClassIdsForTeacher(classes, opts?.timetable ?? [], opts?.homeroomLabel);
  if (assigned.size === 0) return classes;

  const filtered = classes.filter((c) => assigned.has(c.id));
  return filtered.length > 0 ? filtered : classes;
}
