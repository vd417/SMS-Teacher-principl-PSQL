import { tierIncludes, requiredTier, normalizeTier, FEATURE_TIER, TIER_META } from '../gating';

test('normalizeTier defaults unknown values to silver', () => {
  expect(normalizeTier(null)).toBe('silver');
  expect(normalizeTier(undefined)).toBe('silver');
  expect(normalizeTier('')).toBe('silver');
  expect(normalizeTier('bogus')).toBe('silver');
  expect(normalizeTier('Gold')).toBe('gold');
  expect(normalizeTier('PLATINUM')).toBe('platinum');
});

test('tierIncludes follows the silver → gold → platinum ladder', () => {
  expect(tierIncludes('silver', 'library')).toBe(true);
  expect(tierIncludes('silver', 'hr_payroll')).toBe(false);
  expect(tierIncludes('gold', 'hr_payroll')).toBe(false);
  expect(tierIncludes('platinum', 'hr_payroll')).toBe(true);
  expect(tierIncludes('gold', 'attendance.geofence')).toBe(false);
  expect(tierIncludes('platinum', 'attendance.geofence')).toBe(true);
  expect(tierIncludes('platinum', 'transport.gps')).toBe(true);
});

test('requiredTier returns configured minimum or silver', () => {
  expect(requiredTier('hr_payroll')).toBe('platinum');
  expect(requiredTier('attendance.geofence')).toBe('platinum');
  expect(requiredTier('unknown.feature')).toBe('silver');
});

test('FEATURE_TIER and TIER_META cover core keys', () => {
  expect(FEATURE_TIER.library).toBe('silver');
  expect(FEATURE_TIER['reports.csv']).toBe('gold');
  expect(TIER_META.gold.label).toBe('Gold');
});
