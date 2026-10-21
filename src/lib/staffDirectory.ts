import type { SchoolStaffMember } from '@/data/domain';
import { initialsFrom } from '@/data/http/auth.schema';
import { selfDisplayNames, type SelfAccount, type SelfRosterRow } from '@/lib/chatThread';

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

function samePerson(left: string, right: string): boolean {
  const a = personKey(left);
  const b = personKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  return longer.startsWith(`${shorter} `);
}

/** Job title stays, and the account role Principal is shown beside it. */
export function principalDirectoryLabel(designation: string | undefined): string {
  const title = designation?.trim() ?? '';
  const key = personKey(title);
  if (!title || key === 'teacher' || key === 'staff' || key === 'principal') return 'Principal';
  if (/\bprincipal\b/i.test(title)) return title;
  return `${title} · Principal`;
}

function labelRow(row: SchoolStaffMember): SchoolStaffMember {
  const label = principalDirectoryLabel(row.roleLabel);
  return { ...row, roleLabel: label, subtitle: label };
}

/**
 * The signed-in principal stays on Teachers & staff and is labeled Principal.
 * Other people still hide their own row.
 */
export function withSignedInPrincipal(
  rows: SchoolStaffMember[],
  account: SelfAccount & { role?: string; initials?: string },
  roster: SelfRosterRow[]
): SchoolStaffMember[] {
  const selfName = account.name?.trim().toLowerCase() ?? '';
  if (account.role !== 'principal') {
    if (!selfName) return rows;
    return rows.filter((row) => row.name.trim().toLowerCase() !== selfName);
  }

  const known = selfDisplayNames(account, roster);
  const exact = new Set(known.map((name) => name.trim().toLowerCase()));
  let matchIds = new Set(
    rows.filter((row) => exact.has(row.name.trim().toLowerCase())).map((row) => row.id)
  );
  if (matchIds.size === 0) {
    const prefix = rows.filter((row) => known.some((name) => samePerson(row.name, name)));
    if (prefix.length === 1) matchIds = new Set(prefix.map((row) => row.id));
  }

  const labeled = rows.map((row) => (matchIds.has(row.id) ? labelRow(row) : row));
  if (matchIds.size > 0) {
    return labeled.sort((a, b) => {
      const aPrincipal = /\bprincipal\b/i.test(a.roleLabel) ? 0 : 1;
      const bPrincipal = /\bprincipal\b/i.test(b.roleLabel) ? 0 : 1;
      if (aPrincipal !== bPrincipal) return aPrincipal - bPrincipal;
      return a.name.localeCompare(b.name);
    });
  }

  const name = account.name?.trim() || 'Principal';
  const card: SchoolStaffMember = {
    id: account.id?.trim() || 'principal',
    name,
    initials: account.initials?.trim() || initialsFrom(name),
    phone: account.phone?.trim() || undefined,
    email: account.email?.trim() || undefined,
    userId: account.id,
    roleLabel: 'Principal',
    subtitle: 'Principal',
  };
  return [card, ...labeled];
}
