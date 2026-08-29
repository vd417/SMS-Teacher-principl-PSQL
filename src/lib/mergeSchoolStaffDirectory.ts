import type { SchoolStaffMember } from '@/data/domain';

/** Merge teacher + support staff rows for the colleague directory (principal first). */
export function mergeSchoolStaffDirectory(
  teachers: SchoolStaffMember[],
  supportStaff: SchoolStaffMember[]
): SchoolStaffMember[] {
  const byKey = new Map<string, SchoolStaffMember>();
  const key = (member: SchoolStaffMember) => member.name.trim().toLowerCase();

  for (const member of supportStaff) {
    byKey.set(key(member), member);
  }
  for (const member of teachers) {
    byKey.set(key(member), member);
  }

  return [...byKey.values()].sort((a, b) => {
    const aPrincipal = /principal/i.test(a.roleLabel);
    const bPrincipal = /principal/i.test(b.roleLabel);
    if (aPrincipal !== bPrincipal) return aPrincipal ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
