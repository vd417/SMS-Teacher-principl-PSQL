import type { Class } from '@/data/domain';

/** Stable set of class ids the current user is allowed to work with. */
export function assignedClassIdSet(classes: Class[]): Set<string> {
  return new Set(classes.map((c) => c.id));
}

/** Keep only items tied to classes in the assigned set (production teacher scoping). */
export function filterByClassScope<T>(
  items: T[],
  classIds: Set<string>,
  getClassId: (item: T) => string | undefined | null
): T[] {
  if (classIds.size === 0) return [];
  return items.filter((item) => {
    const id = getClassId(item);
    return Boolean(id && classIds.has(id));
  });
}
