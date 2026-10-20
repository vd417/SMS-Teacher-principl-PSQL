import { groupPtmMeetings, groupPtmSlots, type PtmPlacement } from '../ptmGroups';
import type { PtmMeeting } from '@/data/domain';

function meeting(
  partial: Partial<PtmMeeting> & Pick<PtmMeeting, 'id' | 'studentId' | 'studentName'>
): PtmMeeting {
  return {
    date: '2026-10-22',
    time: '11:00',
    teacher: 'Neha Singh',
    teacherId: 't1',
    subject: 'test',
    mode: 'Video call',
    status: 'pending',
    ...partial,
  };
}

const class5a: PtmPlacement = {
  classKey: '5',
  classTitle: 'Class 5',
  sectionKey: 'a',
  sectionTitle: 'Section A',
};
const class5b: PtmPlacement = {
  classKey: '5',
  classTitle: 'Class 5',
  sectionKey: 'b',
  sectionTitle: 'Section B',
};

test('groups one section as Section and lists every meeting in that section', () => {
  const groups = groupPtmMeetings(
    [
      meeting({ id: '1', studentId: 's1', studentName: 'Harsh Shukla' }),
      meeting({ id: '2', studentId: 's2', studentName: 'Kartik Menon' }),
    ],
    { s1: class5a, s2: class5a }
  );

  expect(groups).toHaveLength(1);
  expect(groups[0].classTitle).toBe('Class 5');
  expect(groups[0].scope).toBe('Section');
  expect(groups[0].sections).toHaveLength(1);
  expect(groups[0].sections[0].sectionTitle).toBe('Section A');
  expect(groups[0].sections[0].scope).toBe('Section');
  expect(groups[0].sections[0].meetings.map((item) => item.studentName)).toEqual([
    'Harsh Shukla',
    'Kartik Menon',
  ]);
});

test('marks the same slot across sections as Class wise', () => {
  const groups = groupPtmMeetings(
    [
      meeting({ id: '1', studentId: 's1', studentName: 'Harsh Shukla' }),
      meeting({ id: '2', studentId: 's2', studentName: 'Kartik Menon' }),
    ],
    { s1: class5a, s2: class5b }
  );

  expect(groups[0].scope).toBe('Class wise');
  expect(groups[0].sections.map((section) => section.sectionTitle)).toEqual([
    'Section A',
    'Section B',
  ]);
  expect(groups[0].sections.every((section) => section.scope === 'Class wise')).toBe(true);
  expect(groups[0].sections[0].meetings).toHaveLength(1);
  expect(groups[0].sections[1].meetings).toHaveLength(1);
});

test('a slot shows the teacher and subject, and lists every class when the meeting covers more than one', () => {
  const class6a: PtmPlacement = {
    classKey: '6',
    classTitle: 'Class 6',
    sectionKey: 'a',
    sectionTitle: 'Section A',
  };
  const slots = groupPtmSlots(
    [
      meeting({ id: '1', studentId: 's1', studentName: 'Harsh Shukla' }),
      meeting({ id: '2', studentId: 's2', studentName: 'Kartik Menon' }),
    ],
    { s1: class5a, s2: class6a }
  );

  expect(slots).toHaveLength(1);
  expect(slots[0].teacher).toBe('Neha Singh');
  expect(slots[0].subject).toBe('test');
  expect(slots[0].scope).toBe('All classes');
  expect(slots[0].classes.map((cls) => cls.classTitle)).toEqual(['Class 5', 'Class 6']);
  expect(slots[0].classes[0].sections[0].meetings.map((item) => item.studentName)).toEqual([
    'Harsh Shukla',
  ]);
});
