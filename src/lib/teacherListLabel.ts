import { gradeLabel, sectionLabel } from '@/lib/classLabel';

export type HomeroomClass = {
  classTeacherId?: string;
  name: string;
  grade: string;
  section: string;
};

/** "VI-A" or "5 - A" becomes "VI · Section A" / "Class 5 · Section A". */
export function formatHomeroomLabel(label: string | undefined): string {
  const raw = (label ?? '').trim();
  if (!raw) return '';
  if (/\bclass\b/i.test(raw) && /\bsection\b/i.test(raw)) {
    return raw.replace(/\s*,\s*/g, ' · ');
  }
  const parts = raw.split(/\s*[-–|/]\s*/).filter(Boolean);
  if (parts.length === 2) {
    const grade = parts[0].replace(/^(grade|class)\s+/i, '');
    return `${gradeLabel(grade)} · ${sectionLabel(parts[1])}`;
  }
  return raw;
}

export function homeroomPlace(cls: HomeroomClass): string {
  const grade = cls.grade.trim();
  const section = cls.section.trim();
  if (grade && section) return `${gradeLabel(grade)} · ${sectionLabel(section)}`;
  return formatHomeroomLabel(cls.name || grade || section);
}

/** Classes this teacher is class teacher of. The class row wins; the teacher record fills any gap. */
export function homeroomPlaces(
  teacherId: string | undefined,
  classTeacherText: string | undefined,
  classes: HomeroomClass[]
): string[] {
  const id = (teacherId ?? '').trim();
  const fromClasses = classes
    .filter((cls) => id !== '' && cls.classTeacherId === id)
    .map(homeroomPlace)
    .filter(Boolean);
  const fromText = formatHomeroomLabel(classTeacherText);
  const places = [...new Set(fromClasses)];
  if (fromText && !places.some((place) => place.toLowerCase() === fromText.toLowerCase())) {
    places.push(fromText);
  }
  return places;
}

/** Designation, then the class they are class teacher of. */
export function teacherListMeta(designation: string, places: string[]): string {
  const title = designation.trim();
  const joined = places
    .map((place) => place.trim())
    .filter(Boolean)
    .join(', ');
  if (!joined) return title;
  if (!title) return `Class teacher · ${joined}`;
  if (/class\s*teacher/i.test(title)) return `${title} · ${joined}`;
  return `${title} · Class teacher · ${joined}`;
}
