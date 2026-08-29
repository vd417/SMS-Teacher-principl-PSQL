/** Fields used when matching staff against a search query. */
export type StaffSearchFields = {
  name: string;
  subject: string;
  designation?: string;
  role?: string;
};

export function matchesStaffSearch(staff: StaffSearchFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    staff.name.toLowerCase().includes(q) ||
    staff.subject.toLowerCase().includes(q) ||
    (staff.designation?.toLowerCase().includes(q) ?? false) ||
    (staff.role?.toLowerCase().includes(q) ?? false)
  );
}

export function filterStaffBySearch<T extends StaffSearchFields>(staff: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return staff;
  return staff.filter((member) => matchesStaffSearch(member, q));
}
