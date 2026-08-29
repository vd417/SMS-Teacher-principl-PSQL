import { useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { useMySchools } from './useMySchools';
import { logoForTenant } from '@/lib/schoolBranding';

/** Logo + name for the active school tenant (multi-tenant SaaS). */
export function useCurrentSchoolBranding() {
  const { session, pendingSchools } = useAuth();
  const tenantId = session?.tenant.id;
  const name = session?.tenant.name ?? 'School';
  const { data: schools } = useMySchools();

  const logoUrl = useMemo(() => {
    const fromDirectory = logoForTenant(tenantId, schools);
    if (fromDirectory) return fromDirectory;
    const fromPending = logoForTenant(tenantId, pendingSchools);
    if (fromPending) return fromPending;
    return session?.tenant.logoUrl ?? null;
  }, [tenantId, schools, pendingSchools, session?.tenant.logoUrl]);

  return { name, logoUrl };
}
