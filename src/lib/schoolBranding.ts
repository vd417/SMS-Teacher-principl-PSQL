import type { SchoolChoice } from '@/data/repositories/types';

/** Resolve the logo URL for one tenant from a school directory list. */
export function logoForTenant(
  tenantId: string | undefined,
  schools: SchoolChoice[] | null | undefined
): string | null {
  if (!tenantId || !schools?.length) return null;
  return schools.find((s) => s.id === tenantId)?.logoUrl ?? null;
}

/** Attach the matching school logo onto a session tenant when known. */
export function withTenantLogo<T extends { tenant: { id: string } }>(
  session: T,
  schools: SchoolChoice[] | null | undefined
): T {
  const logoUrl = logoForTenant(session.tenant.id, schools);
  if (!logoUrl) return session;
  return {
    ...session,
    tenant: { ...session.tenant, logoUrl },
  } as T;
}
