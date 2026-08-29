import { useAuth } from '@/features/auth/AuthProvider';
import type { Tier } from '@/data/domain';
import { normalizeTier, requiredTier, tierIncludes } from '@/lib/gating';

/** Current school subscription tier from the auth session (defaults to silver). */
export function useTier(): Tier {
  return normalizeTier(useAuth().session?.tenant.tier);
}

/** Alias for useTier — matches sms-admin `app.plan` vocabulary. */
export function usePlan(): Tier {
  return useTier();
}

/** Whether the current school plan includes a feature, plus the tier needed to unlock it. */
export function useFeature(feature: string): { allowed: boolean; requiredTier: Tier; plan: Tier } {
  const plan = useTier();
  return { allowed: tierIncludes(plan, feature), requiredTier: requiredTier(feature), plan };
}
