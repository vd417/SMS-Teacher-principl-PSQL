import type { ChatContact } from '@/data/domain';

export type ThreadLookup = {
  name: string;
  role?: string;
  childId?: string;
};

function norm(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isParentRole(role: string | undefined): boolean {
  return norm(role) === 'parent';
}

/** Find an existing inbox thread. Parent threads are scoped to a student when childId is known. */
export function findExistingThread(
  contacts: Pick<ChatContact, 'id' | 'name' | 'role' | 'childId'>[],
  query: ThreadLookup
): (typeof contacts)[number] | undefined {
  const childId = query.childId?.trim();
  const roleKey = norm(query.role);
  const nameKey = norm(query.name);

  if (childId) {
    return contacts.find((c) => {
      if (c.childId?.trim() !== childId) return false;
      if (!roleKey) return true;
      return norm(c.role) === roleKey;
    });
  }

  return contacts.find((c) => {
    if (norm(c.name) !== nameKey) return false;
    if (roleKey && norm(c.role) !== roleKey) return false;
    if (isParentRole(query.role) && c.childId) return false;
    return true;
  });
}

export function formatChatIdentity(contact: {
  name: string;
  role?: string;
  childName?: string;
  childClassLabel?: string;
}): { title: string; subtitle: string } {
  const title = contact.name.trim() || 'Contact';
  const role = (contact.role ?? '').trim() || 'Contact';
  const childName = contact.childName?.trim();
  const childClass = contact.childClassLabel?.trim();

  if (isParentRole(role) && childName) {
    const cls = childClass ? ` (${childClass})` : '';
    return { title, subtitle: `Parent of ${childName}${cls}` };
  }

  if (childName) {
    const cls = childClass ? ` (${childClass})` : '';
    return { title, subtitle: `${role} · ${childName}${cls}` };
  }

  return { title, subtitle: role };
}
