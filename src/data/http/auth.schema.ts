import { z } from 'zod';
import type { Session, User, Tenant, Role } from '@/data/domain';

// ─── Wire schemas ────────────────────────────────────────────────────────────
export const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});
export type TokenWire = z.infer<typeof tokenSchema>;

// /auth/me. id/tenant_id/roles always present; the display profile fields are
// optional so the app still works if the backend /me extension hasn't shipped.
export const meSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  roles: z.array(z.string()).default([]),
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  employee: z.string().optional(),
  classroom: z.string().optional(),
  joined: z.string().optional(),
  tenant_name: z.string().optional(),
  must_set_password: z.boolean().optional(),
});
export type MeWire = z.infer<typeof meSchema>;

// ─── Mapping ─────────────────────────────────────────────────────────────────
// Backend authz uses namespaced roles (`school.principal` / `school.teacher`, see
// sms-backend Policies.cs); unqualified `principal` / `teacher` are also accepted.
// Match on the last dotted segment so both vocabularies map to the app Role.
export function pickRole(roles: string[]): Role {
  const leaves = roles.map((r) => r.split('.').pop());
  return leaves.includes('principal') ? 'principal' : 'teacher';
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function toUserFromMe(me: MeWire): User {
  const name = me.name ?? '';
  return {
    id: me.id,
    name,
    initials: initialsFrom(name),
    title: me.title ?? '',
    email: me.email ?? '',
    phone: me.phone ?? '',
    employee: me.employee ?? '',
    classroom: me.classroom ?? '',
    joined: me.joined ?? '',
    role: pickRole(me.roles),
    mustSetPassword: me.must_set_password ?? false,
  };
}

export function toTenantFromMe(me: MeWire): Tenant {
  return { id: me.tenant_id, name: me.tenant_name ?? '' };
}

export function toSessionFromMe(
  tokens: { accessToken: string; refreshToken: string },
  me: MeWire
): Session {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toUserFromMe(me),
    tenant: toTenantFromMe(me),
  };
}

// Masks an email/phone identifier for display ("a••@x.com" / "••••0118").
export function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');
    const head = local.slice(0, 1);
    return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }
  const tail = identifier.slice(-4);
  return `${'•'.repeat(Math.max(identifier.length - 4, 0))}${tail}`;
}
