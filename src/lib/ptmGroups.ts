import type { PtmMeeting } from '@/data/domain';
import { gradeLabel, sectionLabel } from '@/lib/classLabel';
import { compareGrades, compareSections } from '@/lib/gradeSort';

export type PtmScope = 'Class wise' | 'Section' | 'One student' | 'All classes';

export type PtmPlacement = {
  classKey: string;
  classTitle: string;
  sectionKey: string;
  sectionTitle: string;
};

export type PtmSectionGroup = {
  sectionKey: string;
  sectionTitle: string;
  meetings: PtmMeeting[];
  scope: PtmScope | 'Mixed';
};

export type PtmClassGroup = {
  classKey: string;
  classTitle: string;
  sections: PtmSectionGroup[];
  meetingCount: number;
  scope: PtmScope | 'Mixed';
};

const OTHER: PtmPlacement = {
  classKey: 'other',
  classTitle: 'Other',
  sectionKey: 'all',
  sectionTitle: 'All meetings',
};

export function placementFromClass(cls: {
  grade: string;
  name: string;
  section: string;
}): PtmPlacement {
  const classTitle = gradeLabel((cls.grade || cls.name).trim() || 'Other');
  const sectionTitle = cls.section.trim() ? sectionLabel(cls.section.trim()) : 'All meetings';
  return {
    classKey: (cls.grade || cls.name).trim().toLowerCase() || 'other',
    classTitle,
    sectionKey: cls.section.trim().toLowerCase() || 'all',
    sectionTitle,
  };
}

export function placementForMeeting(
  meeting: PtmMeeting,
  byStudent: Record<string, PtmPlacement>
): PtmPlacement {
  const fromRoster = byStudent[meeting.studentId];
  if (fromRoster) return fromRoster;
  if (meeting.className?.trim() || meeting.sectionName?.trim()) {
    return placementFromClass({
      grade: meeting.className?.trim() ?? '',
      name: meeting.className?.trim() || 'Other',
      section: meeting.sectionName?.trim() ?? '',
    });
  }
  return OTHER;
}

function batchKey(meeting: PtmMeeting): string {
  return [
    meeting.date,
    meeting.time,
    meeting.subject ?? '',
    meeting.mode,
    meeting.teacher,
    meeting.meetingLink ?? '',
  ].join('\u0001');
}

export function meetingScope(
  batch: PtmMeeting[],
  place: (meeting: PtmMeeting) => PtmPlacement
): PtmScope {
  if (batch.length <= 1) return 'One student';
  const classKeys = new Set(batch.map((meeting) => place(meeting).classKey));
  if (classKeys.size > 1) return 'All classes';
  const sectionKeys = new Set(batch.map((meeting) => place(meeting).sectionKey));
  if (sectionKeys.size > 1) return 'Class wise';
  return 'Section';
}

function combineScope(scopes: (PtmScope | 'Mixed')[]): PtmScope | 'Mixed' {
  const unique = [...new Set(scopes)];
  return unique.length === 1 ? unique[0] : 'Mixed';
}

export function groupPtmMeetings(
  meetings: PtmMeeting[],
  byStudent: Record<string, PtmPlacement>
): PtmClassGroup[] {
  const place = (meeting: PtmMeeting) => placementForMeeting(meeting, byStudent);
  const batches = new Map<string, PtmMeeting[]>();
  for (const meeting of meetings) {
    const key = batchKey(meeting);
    const list = batches.get(key) ?? [];
    list.push(meeting);
    batches.set(key, list);
  }

  const scopeById = new Map<string, PtmScope>();
  for (const batch of batches.values()) {
    const scope = meetingScope(batch, place);
    for (const meeting of batch) scopeById.set(meeting.id, scope);
  }

  const classes = new Map<
    string,
    { title: string; sections: Map<string, { title: string; meetings: PtmMeeting[] }> }
  >();
  for (const meeting of meetings) {
    const placement = place(meeting);
    let classGroup = classes.get(placement.classKey);
    if (!classGroup) {
      classGroup = { title: placement.classTitle, sections: new Map() };
      classes.set(placement.classKey, classGroup);
    }
    let sectionGroup = classGroup.sections.get(placement.sectionKey);
    if (!sectionGroup) {
      sectionGroup = { title: placement.sectionTitle, meetings: [] };
      classGroup.sections.set(placement.sectionKey, sectionGroup);
    }
    sectionGroup.meetings.push(meeting);
  }

  const groups: PtmClassGroup[] = [];
  for (const [classKey, classGroup] of classes) {
    const sections: PtmSectionGroup[] = [...classGroup.sections.entries()].map(
      ([sectionKey, section]) => {
        const sectionMeetings = [...section.meetings].sort((a, b) => {
          const byWhen = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
          return byWhen || a.studentName.localeCompare(b.studentName);
        });
        return {
          sectionKey,
          sectionTitle: section.title,
          meetings: sectionMeetings,
          scope: combineScope(
            sectionMeetings.map((meeting) => scopeById.get(meeting.id) ?? 'Section')
          ),
        };
      }
    );
    sections.sort((a, b) => compareSections(a.sectionTitle, b.sectionTitle));
    groups.push({
      classKey,
      classTitle: classGroup.title,
      sections,
      meetingCount: sections.reduce((count, section) => count + section.meetings.length, 0),
      scope: combineScope(sections.map((section) => section.scope)),
    });
  }
  groups.sort((a, b) => compareGrades(a.classTitle, b.classTitle));
  return groups;
}

export type PtmSlot = {
  key: string;
  teacher: string;
  subject: string | null;
  date: string;
  time: string;
  mode: string;
  meetingLink?: string;
  scope: PtmScope;
  classes: PtmClassGroup[];
  meetings: PtmMeeting[];
};

/** One scheduled PTM (same subject, teacher, date, and time), then its classes. */
export function groupPtmSlots(
  meetings: PtmMeeting[],
  byStudent: Record<string, PtmPlacement>
): PtmSlot[] {
  const place = (meeting: PtmMeeting) => placementForMeeting(meeting, byStudent);
  const batches = new Map<string, PtmMeeting[]>();
  for (const meeting of meetings) {
    const key = batchKey(meeting);
    const list = batches.get(key) ?? [];
    list.push(meeting);
    batches.set(key, list);
  }

  const slots: PtmSlot[] = [];
  for (const [key, batch] of batches) {
    const first = batch[0];
    slots.push({
      key,
      teacher: first.teacher,
      subject: first.subject,
      date: first.date,
      time: first.time,
      mode: first.mode,
      ...(first.meetingLink ? { meetingLink: first.meetingLink } : {}),
      scope: meetingScope(batch, place),
      classes: groupPtmMeetings(batch, byStudent),
      meetings: batch,
    });
  }
  slots.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return slots;
}
