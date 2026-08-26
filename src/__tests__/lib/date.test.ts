import {
  todayISO,
  formatLongDate,
  addDays,
  greeting,
  parseApiInstant,
  formatTimeOfDay,
  toDateOnly,
  weekdayShort,
} from '@/lib/date';

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

  it('greeting varies with the time of day', () => {
    expect(greeting(new Date(2026, 3, 27, 8))).toBe('Good morning,');
    expect(greeting(new Date(2026, 3, 27, 14))).toBe('Good afternoon,');
    expect(greeting(new Date(2026, 3, 27, 20))).toBe('Good evening,');
  });

  it('parseApiInstant treats naive UTC timestamps as UTC', () => {
    const d = parseApiInstant('2026-07-30T11:22:00');
    expect(d.toISOString()).toBe('2026-07-30T11:22:00.000Z');
    expect(typeof formatTimeOfDay('2026-07-30T11:22:00')).toBe('string');
  });

  it('toDateOnly normalizes datetime strings', () => {
    expect(toDateOnly('2026-07-30T00:00:00')).toBe('2026-07-30');
  });

  it('weekdayShort is the local three-letter weekday', () => {
    expect(weekdayShort('2026-08-26')).toBe('Wed');
    expect(weekdayShort('2026-08-25')).toBe('Tue');
  });
});
