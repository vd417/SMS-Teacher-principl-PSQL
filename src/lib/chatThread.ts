import type { ChatContact } from '@/data/domain';
import { gradeLabel, sectionLabel } from '@/lib/classLabel';
import { isTeachingDesignation } from '@/lib/staffCategory';
import { homeroomPlaces, teacherListMeta, type HomeroomClass } from '@/lib/teacherListLabel';

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
  if (!leaf) return false;
  if (isTeachingDesignation(leaf) || leaf === 'hod') return true;
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

function isPrincipalRole(role: string | undefined): boolean {
  const value = norm(role);
  if (!value) return false;
  const leaf = value.includes('.') ? (value.split('.').pop() ?? value) : value;
  return leaf.includes('principal') && !leaf.includes('vice');
}

/** A lone teaching title such as "HOD" is the designation. The account role stays beside it. */
function staffDesignationAndRole(
  role?: string,
  designation?: string
): { role?: string; designation?: string } {
  const title = designation?.trim();
  const raw = role?.trim() ?? '';
  if (title || !raw || /[·•|/]/.test(raw)) return { role: raw, designation: title };
  const leaf = norm(raw).includes('.') ? (norm(raw).split('.').pop() ?? '') : norm(raw);
  if (leaf === 'teacher' || leaf.includes('principal') || leaf.includes('vice')) {
    return { role: raw };
  }
  if (isTeachingDesignation(raw) || leaf === 'hod') {
    return { designation: humanizeRole(raw), role: 'Teacher' };
  }
  return { role: raw };
}
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
  classTeacherOf?: string;
  childName?: string;
  childAdmissionNo?: string;
  childClassLabel?: string;
  childSummaries?: string[];
}): { title: string; subtitle: string } {
  const title = contact.name.trim() || 'Contact';
  const childLines = contact.childSummaries?.map((line) => line.trim()).filter(Boolean);
  const childName = contact.childName?.trim();
  const placement = formatClassSection(contact.childClassLabel);

  if (isStudentRole(contact.role)) {
    const places = childLines && childLines.length > 0 ? childLines : [placement].filter(Boolean);
    if (places.length === 0) return { title, subtitle: 'Student' };
    if (places.length === 1) return { title, subtitle: `Student · ${places[0]}` };
    return { title, subtitle: ['Student', ...places].join('\n') };
  }

  if (isParentRole(contact.role) || (childName && !isStaffAccount(contact.role))) {
    const details =
      childLines && childLines.length > 0
        ? childLines.join('\n')
        : [childName, placement].filter(Boolean).join(' · ');
    return { title, subtitle: details ? `Parent\n${details}` : 'Parent' };
  }

  const staff = staffDesignationAndRole(contact.role, contact.designation);
  return {
    title,
    subtitle: teacherListMeta(
      staffLabel(staff.role, staff.designation),
      contact.classTeacherOf ? [contact.classTeacherOf] : []
    ),
  };
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
    childAdmissionNo: newer.childAdmissionNo || older.childAdmissionNo,
    childClassLabel: newer.childClassLabel || older.childClassLabel,
    childSummaries: newer.childSummaries?.length ? newer.childSummaries : older.childSummaries,
    designation: newer.designation || older.designation,
    classTeacherOf: newer.classTeacherOf || older.classTeacherOf,
    photoUrl: newer.photoUrl || older.photoUrl,
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

type RosterStudent = {
  id: string;
  name: string;
  admissionNo?: string;
  parent?: string;
  grade?: string;
  section?: string;
  classLabel?: string;
};

function rosterClassSection(student: RosterStudent): string {
  const grade = student.grade?.trim() ?? '';
  const section = student.section?.trim() ?? '';
  if (grade && section) {
    const bare = grade.replace(/^(grade|class)\s+/i, '');
    return `${gradeLabel(bare)} · ${sectionLabel(section)}`;
  }
  const fromLabel = formatClassSection(student.classLabel);
  if (fromLabel) return fromLabel;
  if (grade) return gradeLabel(grade.replace(/^(grade|class)\s+/i, ''));
  if (section) return sectionLabel(section);
  return '';
}

function studentLine(student: RosterStudent, fallbackClass?: string): string {
  const placement = rosterClassSection(student) || formatClassSection(fallbackClass);
  return [student.name.trim(), placement].filter(Boolean).join(' · ');
}

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'smt', 'shri']);

function personKey(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((part) => part && !HONORIFICS.has(part))
    .join(' ');
}

function phoneKey(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function emailKey(value: string | undefined): string {
  const email = (value ?? '').trim().toLowerCase();
  return email.includes('@') ? email : '';
}

export type SelfAccount = {
  name?: string;
  id?: string;
  phone?: string;
  email?: string;
};

export type SelfRosterRow = {
  name: string;
  userId?: string;
  phone?: string;
  email?: string;
};

/**
 * Names that belong to the signed-in person. The inbox label often comes from the
 * teacher or staff row (for example "Neha Singh") while the login name is blank
 * or shorter. Match that row by user id, email, or phone.
 */
export function selfDisplayNames(account: SelfAccount, roster: SelfRosterRow[]): string[] {
  const names = new Set<string>();
  const accountName = account.name?.trim();
  if (accountName) names.add(accountName);

  const id = (account.id ?? '').trim().toLowerCase();
  const phone = phoneKey(account.phone);
  const email = emailKey(account.email);
  for (const row of roster) {
    const rowName = row.name.trim();
    if (!rowName) continue;
    const rowId = (row.userId ?? '').trim().toLowerCase();
    const linked =
      (id !== '' && rowId !== '' && id === rowId) ||
      (phone !== '' && phoneKey(row.phone) === phone) ||
      (email !== '' && emailKey(row.email) === email);
    if (linked) names.add(rowName);
  }
  return [...names];
}

/**
 * Staff threads often store only a job title (HOD) and drop the account role.
 * A principal keeps that title and is labeled Principal. Other staff keep their
 * directory title beside Teacher.
 */
export function withStaffRoles(
  contacts: ChatContact[],
  roster: {
    id?: string;
    name: string;
    roleLabel?: string;
    userId?: string;
    classTeacher?: string;
  }[],
  principalUserId?: string,
  classes: HomeroomClass[] = []
): ChatContact[] {
  const principalId = (principalUserId ?? '').trim().toLowerCase();
  const byName = new Map<string, (typeof roster)[number]>();
  for (const row of roster) {
    const key = personKey(row.name);
    if (key && !byName.has(key)) byName.set(key, row);
  }

  return contacts.map((contact) => {
    if (isParentRole(contact.role) || isStudentRole(contact.role)) return contact;
    const row = byName.get(personKey(contact.name));
    const linkedPrincipal =
      principalId !== '' && (row?.userId ?? '').trim().toLowerCase() === principalId;
    const directoryTitle = row?.roleLabel?.trim();
    const principalContact = linkedPrincipal || isPrincipalRole(contact.role);
    const designation =
      contact.designation?.trim() ||
      (directoryTitle &&
      !isPrincipalRole(directoryTitle) &&
      personKey(directoryTitle) !== 'teacher' &&
      (principalContact || personKey(directoryTitle) !== personKey(contact.role))
        ? directoryTitle
        : undefined);
    const places = homeroomPlaces(row?.id, row?.classTeacher, classes);
    const classTeacherOf = places.length > 0 ? places.join(', ') : contact.classTeacherOf;
    const labeled = {
      ...contact,
      ...(designation ? { designation } : {}),
      ...(classTeacherOf ? { classTeacherOf } : {}),
    };
    if (principalContact) return { ...labeled, role: 'Principal' };
    if (!designation && !classTeacherOf) return contact;
    return labeled;
  });
}

/** The signed-in person must not see a chat with themselves. */
export function withoutSelfChat<T extends { name: string }>(
  contacts: T[],
  selfName?: string | readonly string[]
): T[] {
  const selves = (Array.isArray(selfName) ? selfName : [selfName])
    .map((name) => personKey(name))
    .filter(Boolean);
  if (selves.length === 0) return contacts;
  return contacts.filter((contact) => !selves.includes(personKey(contact.name)));
}
export function withParentClassSections(
  contacts: ChatContact[],
  students: RosterStudent[]
): ChatContact[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  const byParent = new Map<string, RosterStudent[]>();
  for (const student of students) {
    const key = norm(student.parent);
    if (!key) continue;
    const rows = byParent.get(key) ?? [];
    rows.push(student);
    byParent.set(key, rows);
  }

  const byStudentName = new Map<string, RosterStudent[]>();
  for (const student of students) {
    const key = norm(student.name);
    if (!key) continue;
    const rows = byStudentName.get(key) ?? [];
    rows.push(student);
    byStudentName.set(key, rows);
  }

  return contacts.map((contact) => {
    const linked = contact.childId ? byId.get(contact.childId) : undefined;
    const studentThread = isStudentRole(contact.role);
    if (!studentThread && !isParentRole(contact.role)) return contact;
    // A thread tied to one child stays that child. A student thread matches that student by
    // name. A parent thread lists every child, each with their own class and section.
    const matches = linked
      ? [linked]
      : studentThread
        ? (byStudentName.get(norm(contact.childName || contact.name)) ?? [])
        : (byParent.get(norm(contact.name)) ?? []);
    if (matches.length === 0) {
      if (!studentThread || !contact.childClassLabel) return contact;
      return { ...contact, childSummaries: [formatClassSection(contact.childClassLabel)] };
    }
    if (studentThread) {
      const places = [
        ...new Set(
          matches
            .map(
              (student) =>
                rosterClassSection(student) || formatClassSection(contact.childClassLabel)
            )
            .filter(Boolean)
        ),
      ];
      const first = matches[0];
      return {
        ...contact,
        ...(first.name.trim() ? { childName: first.name.trim() } : {}),
        ...(places[0] ? { childClassLabel: contact.childClassLabel || places[0] } : {}),
        ...(places.length > 0 ? { childSummaries: places } : {}),
      };
    }
    const lines = matches
      .map((student, index) =>
        studentLine(student, index === 0 ? contact.childClassLabel : undefined)
      )
      .filter(Boolean);
    if (lines.length === 0) return contact;
    const first = matches[0];
    return {
      ...contact,
      ...(first.name.trim() ? { childName: first.name.trim() } : {}),
      ...(!contact.childClassLabel && rosterClassSection(first)
        ? { childClassLabel: rosterClassSection(first) }
        : {}),
      childSummaries: lines,
    };
  });
}

type PhotoStudent = { id: string; name: string; photoUrl?: string | null };
type PhotoPerson = { name: string; photoUrl?: string | null };

/** Fill a missing chat photo from the student, teacher, or driver (staff) record. */
export function withProfilePhotos(
  contacts: ChatContact[],
  students: PhotoStudent[],
  people: PhotoPerson[]
): ChatContact[] {
  const studentById = new Map(
    students.map((student) => [student.id, student.photoUrl?.trim() || ''])
  );
  const studentByName = new Map<string, string>();
  for (const student of students) {
    const photo = student.photoUrl?.trim();
    const key = personKey(student.name);
    if (photo && key && !studentByName.has(key)) studentByName.set(key, photo);
  }
  const personByName = new Map<string, string>();
  for (const person of people) {
    const photo = person.photoUrl?.trim();
    const key = personKey(person.name);
    if (photo && key && !personByName.has(key)) personByName.set(key, photo);
  }

  return contacts.map((contact) => {
    if (contact.photoUrl?.trim()) return contact;
    const ownName = personKey(contact.name);
    const childName = personKey(contact.childName);
    let photo = '';
    if (isStudentRole(contact.role)) {
      photo =
        (contact.childId && studentById.get(contact.childId)) ||
        studentByName.get(ownName) ||
        (childName ? studentByName.get(childName) : '') ||
        '';
    } else if (!isParentRole(contact.role)) {
      photo = personByName.get(ownName) || '';
    }
    return photo ? { ...contact, photoUrl: photo } : contact;
  });
}
