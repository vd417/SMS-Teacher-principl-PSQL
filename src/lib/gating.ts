import type { Tier } from '@/data/domain';

/** Ordered plan tiers — mirrors sms-admin mockDb / backend TierFeatures. */
export const TIERS: Tier[] = ['silver', 'gold', 'platinum'];

export interface TierMeta {
  label: string;
  color: string;
  backgroundColor: string;
}

export const TIER_META: Record<Tier, TierMeta> = {
  silver: { label: 'Silver', color: '#7C849C', backgroundColor: '#F2F4F9' },
  gold: { label: 'Gold', color: '#C9A227', backgroundColor: '#FEE8B5' },
  platinum: { label: 'Platinum', color: '#1A0129', backgroundColor: '#EDE6F1' },
};

/** Minimum tier required for each feature key. */
export const FEATURE_TIER: Record<string, Tier> = {
  sis: 'silver',
  academics: 'silver',
  attendance: 'silver',
  exams: 'silver',
  fees: 'silver',
  communication: 'silver',
  operations: 'silver',
  library: 'silver',
  transport: 'silver',
  hostel: 'silver',
  sports: 'silver',
  hr_payroll: 'platinum',
  'analytics.weak_students': 'gold',
  'reporting.advanced': 'gold',
  'reports.csv': 'gold',
  'analytics.advanced': 'gold',
  'attendance.geofence': 'platinum',
  'transport.gps': 'platinum',
  'support.dedicated': 'platinum',
};

export function normalizeTier(raw?: string | null): Tier {
  const t = (raw ?? 'silver').trim().toLowerCase();
  if (t === 'gold' || t === 'platinum') return t;
  return 'silver';
}

export function tierIncludes(plan: Tier, feature: string): boolean {
  const need = FEATURE_TIER[feature] ?? 'silver';
  return TIERS.indexOf(plan) >= TIERS.indexOf(need);
}

export function requiredTier(feature: string): Tier {
  return FEATURE_TIER[feature] ?? 'silver';
}
