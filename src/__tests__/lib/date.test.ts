import { todayISO, formatLongDate, addDays } from '@/lib/date';

describe('date helpers', () => {
  it('todayISO formats a given local date as YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 3, 27))).toBe('2026-04-27'); // month is 0-based
  });

  it('todayISO zero-pads month and day', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatLongDate renders a human date', () => {
    expect(formatLongDate('2026-04-27')).toBe('Mon, 27 Apr 2026');
  });

  it('addDays moves the date forward and backward without timezone drift', () => {
    expect(addDays('2026-04-27', 1)).toBe('2026-04-28');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
