import { formatLastSynced } from '../lastSynced';

const now = new Date(2026, 8, 29, 12, 0, 0).getTime();

describe('formatLastSynced', () => {
  it('handles never', () => {
    expect(formatLastSynced(undefined, now)).toBe('Never synced');
    expect(formatLastSynced(0, now)).toBe('Never synced');
  });
  it('just now', () => expect(formatLastSynced(now - 59_999, now)).toBe('just now'));
  it('minutes', () => {
    expect(formatLastSynced(now - 60_000, now)).toBe('1 min ago');
    expect(formatLastSynced(now - 59 * 60_000, now)).toBe('59 min ago');
  });
  it('hours', () => {
    expect(formatLastSynced(now - 60 * 60_000, now)).toBe('1 h ago');
    expect(formatLastSynced(now - 23 * 3_600_000, now)).toBe('23 h ago');
  });
  it('date', () => {
    expect(formatLastSynced(new Date(2026, 8, 20, 9).getTime(), now)).toBe('Sep 20');
    expect(formatLastSynced(now - 24 * 3_600_000, now)).toBe('Sep 28');
  });
});
