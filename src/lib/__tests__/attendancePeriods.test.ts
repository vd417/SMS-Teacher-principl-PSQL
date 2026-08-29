import {
  attendancePeriodRows,
  isSlotCurrent,
  lunchTimeLabel,
  lunchWindow,
  parseHmToMinutes,
} from '../attendancePeriods';
import type { ClassDayTimetableSlot } from '@/data/repositories/types';

function slot(
  period: number,
  times: { start: string; end: string },
  extra: Partial<ClassDayTimetableSlot> = {}
): ClassDayTimetableSlot {
  return {
    id: `p${period}`,
    period,
    subject: `Sub${period}`,
    subjectId: null,
    startTime: times.start,
    endTime: times.end,
    teacherId: null,
    teacherName: 'T',
    isCurrent: false,
    marked: false,
    canMark: true,
    ...extra,
  };
}

test('parseHmToMinutes reads HH:mm', () => {
  expect(parseHmToMinutes('12:05')).toBe(12 * 60 + 5);
  expect(parseHmToMinutes('9:30')).toBe(9 * 60 + 30);
  expect(parseHmToMinutes('')).toBeNull();
});

test('lunchWindow is P4 end to P5 start', () => {
  expect(
    lunchWindow([
      slot(4, { start: '11:15', end: '12:00' }),
      slot(5, { start: '12:40', end: '13:25' }),
    ])
  ).toEqual({ startTime: '12:00', endTime: '12:40' });
});

test('attendancePeriodRows inserts lunch between morning and afternoon', () => {
  const rows = attendancePeriodRows(
    [slot(5, { start: '12:40', end: '13:25' }), slot(4, { start: '11:15', end: '12:00' })],
    null
  );
  expect(rows.map((r) => (r.kind === 'slot' ? `P${r.slot.period}` : 'lunch'))).toEqual([
    'P4',
    'lunch',
    'P5',
  ]);
  expect(rows[1]).toMatchObject({
    kind: 'lunch',
    startTime: '12:00',
    endTime: '12:40',
    isCurrent: false,
  });
});

test('attendancePeriodRows highlights lunch when now is in the lunch window', () => {
  const rows = attendancePeriodRows(
    [slot(4, { start: '11:15', end: '12:00' }), slot(5, { start: '12:40', end: '13:25' })],
    12 * 60 + 10
  );
  const lunch = rows.find((r) => r.kind === 'lunch');
  expect(lunch).toMatchObject({ kind: 'lunch', isCurrent: true });
});

test('attendancePeriodRows skips lunch when there is no afternoon period', () => {
  const rows = attendancePeriodRows([slot(2, { start: '08:40', end: '09:20' })], 12 * 60);
  expect(rows).toHaveLength(1);
  expect(rows[0].kind).toBe('slot');
});

test('lunchTimeLabel shows the range', () => {
  expect(lunchTimeLabel('12:00', '12:40')).toBe('12:00–12:40');
  expect(lunchTimeLabel(null, null)).toBe('');
});

test('isSlotCurrent uses bell times, not a stale server flag', () => {
  const morningMusic = slot(2, { start: '09:00', end: '09:45' }, { isCurrent: true });
  const afternoonMusic = slot(8, { start: '14:20', end: '15:05' }, { isCurrent: false });
  const at1431 = 14 * 60 + 31;
  expect(isSlotCurrent(morningMusic, at1431)).toBe(false);
  expect(isSlotCurrent(afternoonMusic, at1431)).toBe(true);
  expect(isSlotCurrent(afternoonMusic, null)).toBe(false);
});

test('attendancePeriodRows overlays live NOW so afternoon Music is current, not morning Music', () => {
  const rows = attendancePeriodRows(
    [
      slot(2, { start: '09:00', end: '09:45' }, { subject: 'Music', isCurrent: true }),
      slot(8, { start: '14:20', end: '15:05' }, { subject: 'Music', isCurrent: false }),
    ],
    14 * 60 + 31
  );
  const slots = rows.filter((r) => r.kind === 'slot');
  expect(slots[0]).toMatchObject({ kind: 'slot', slot: { period: 2, isCurrent: false } });
  expect(slots[1]).toMatchObject({ kind: 'slot', slot: { period: 8, isCurrent: true } });
});
