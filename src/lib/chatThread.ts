import type { ChatContact } from '@/data/domain';
import { gradeLabel, sectionLabel } from '@/lib/classLabel';

export type ThreadLookup = {
  name: string;
  role?: string;
  childId?: string;
};

function norm(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isParentRole(role: string | undefined): boolean {
  const value = norm(role);
  if (!value) return false;
  const leaf = value.includes('.') ? (value.split('.').pop() ?? value) : value;
  return leaf === 'parent' || leaf === 'guardian' || leaf === 'mother' || leaf === 'father';
}

/** Class and section as "Class 5 · Section A". Combined labels such as "5 - A" are split. */
export function formatClassSection(label: string | undefined): string {
  const raw = (label ?? '').trim();
  if (!raw) return '';
  if (/\bclass\b/i.test(raw) && /\bsection\b/i.test(raw)) {
    return raw.replace(/\s*,\s*/g, ' · ');
  }
  const parts = raw.split(/\s*[-–|/]\s*/).filter(Boolean);
  if (parts.length === 2) {
    const grade = parts[0].replace(/^(grade|class)\s+/i, '');
    return `${gradeLabel(grade)} · ${sectionLabel(parts[1])}`;
  }
  return raw;
}

function humanizeRole(value: string): string {
  const leaf = value.includes('.') ? (value.split('.').pop() ?? value) : value;
  if (!leaf.includes('.') && !leaf.includes('_') && leaf !== value) {
    return leaf
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  if (!value.includes('.') && !value.includes('_')) return value.trim();
  return leaf
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function isStaffAccount(role: string | undefined): boolean {
  const leaf = norm(role).includes('.') ? (norm(role).split('.').pop() ?? '') : norm(role);
  return (
    leaf.includes('principal') ||
    leaf.includes('teacher') ||
    leaf === 'admin' ||
    leaf === 'owner' ||
    leaf === 'staff' ||
    leaf.includes('vice')
  );
}

function isStudentRole(role: string | undefined): boolean {
  const value = norm(role);
  if (!value) return false;
  const leaf = value.includes('.') ? (value.split('.').pop() ?? value) : value;
  return leaf === 'student';
}

/** Designation and role both stay visible. Identical words are not repeated. */
function staffLabel(role: string | undefined, designation?: string): string {
  const title = designation?.trim() ?? '';
  const roleParts = (role ?? '')
    .split(/\s*[·•|/]\s*/)
    .map((part) => humanizeRole(part))
    .filter(Boolean);
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const part of [title, ...roleParts]) {
    const key = norm(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    parts.push(part);
  }
  return parts.join(' · ') || 'Staff';
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
    const sameChild = contacts.filter((c) => c.childId?.trim() === childId);
    if (isStudentRole(query.role) || isParentRole(query.role)) {
      const parentThread = sameChild.find((c) => isParentRole(c.role) || Boolean(c.childName));
      if (parentThread) return parentThread;
    }
    const exact = sameChild.find((c) => !roleKey || norm(c.role) === roleKey);
    if (exact) return exact;
    if (isParentRole(query.role)) {
      return contacts.find((c) => isParentRole(c.role) && norm(c.name) === nameKey && !c.childId);
    }
    return undefined;
  }

  return contacts.find((c) => {
    if (norm(c.name) !== nameKey) return false;
    const queryIsParent = isParentRole(query.role);
    const contactIsParent = isParentRole(c.role) || Boolean(c.childId);
    if (queryIsParent || contactIsParent) {
      if (queryIsParent && c.childId) return false;
      return queryIsParent && contactIsParent;
    }
    return true;
  });
}

export function formatChatIdentity(contact: {
  name: string;
  role?: string;
  designation?: string;
  childName?: string;
  childClassLabel?: string;
}): { title: string; subtitle: string } {
  const title = contact.name.trim() || 'Contact';
  const childName = contact.childName?.trim();
  const placement = formatClassSection(contact.childClassLabel);

  if (isParentRole(contact.role) || (childName && !isStaffAccount(contact.role))) {
    const subtitle = [childName, placement].filter(Boolean).join(' · ');
    return { title, subtitle: subtitle || 'Parent' };
  }

  return { title, subtitle: staffLabel(contact.role, contact.designation) };
}

function threadKey(contact: Pick<ChatContact, 'name' | 'role' | 'childId'>): string {
  const name = norm(contact.name);
  const childId = contact.childId?.trim();
  if (childId) return `child:${name}:${childId}`;
  if (isParentRole(contact.role)) return `parent:${name}`;
  return `staff:${name}`;
}

function preferContact(current: ChatContact, next: ChatContact): ChatContact {
  const currentAt = current.lastAt ?? '';
  const nextAt = next.lastAt ?? '';
  const newer =
    nextAt > currentAt
      ? next
      : currentAt > nextAt
        ? current
        : next.unread > current.unread
          ? next
          : current;
  const older = newer === current ? next : current;
  return {
    ...newer,
    unread: Math.max(current.unread, next.unread),
    childId: newer.childId || older.childId,
    childName: newer.childName || older.childName,
    childClassLabel: newer.childClassLabel || older.childClassLabel,
    designation: newer.designation || older.designation,
    lastMessage: newer.lastMessage || older.lastMessage,
    time: newer.time || older.time,
    lastAt: newer.lastAt || older.lastAt,
  };
}

/** One card per person. Parent threads stay split by student. Staff designation and role variants collapse. */
export function dedupeChatContacts(contacts: ChatContact[]): ChatContact[] {
  const byKey = new Map<string, ChatContact>();
  const order: string[] = [];
  for (const contact of contacts) {
    const key = threadKey(contact);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, contact);
      order.push(key);
      continue;
    }
    byKey.set(key, preferContact(existing, contact));
  }

  const parentNamesWithChild = new Set(
    [...byKey.keys()].filter((key) => key.startsWith('child:')).map((key) => key.split(':')[1])
  );

  const parentChildIds = new Set(
    [...byKey.values()].filter((c) => c.childId && isParentRole(c.role)).map((c) => c.childId)
  );

  return order
    .filter((key) => {
      const row = byKey.get(key);
      if (!row) return false;
      if (row.childId && isStudentRole(row.role) && parentChildIds.has(row.childId)) return false;
      if (!key.startsWith('parent:')) return true;
      const name = key.slice('parent:'.length);
      return !parentNamesWithChild.has(name);
    })
    .map((key) => byKey.get(key)!);
}
