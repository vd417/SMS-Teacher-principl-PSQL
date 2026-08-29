import { Colors } from './colors';

export interface ColorSet {
  color: string;
  colorSoft: string;
  colorTint: string;
}

const PALETTE: ColorSet[] = [
  { color: Colors.pink, colorSoft: Colors.pinkSoft, colorTint: Colors.pinkTint },
  { color: Colors.coral, colorSoft: Colors.coralSoft, colorTint: Colors.coralTint },
  { color: Colors.blue, colorSoft: Colors.blueSoft, colorTint: Colors.blueTint },
  { color: Colors.teal, colorSoft: Colors.tealSoft, colorTint: Colors.tealTint },
  { color: Colors.violet, colorSoft: Colors.violetSoft, colorTint: Colors.violetTint },
  { color: Colors.orange, colorSoft: Colors.orangeSoft, colorTint: Colors.orangeTint },
  { color: Colors.indigo, colorSoft: Colors.indigoSoft, colorTint: Colors.indigoTint },
  { color: Colors.mint, colorSoft: Colors.mintSoft, colorTint: Colors.mintTint },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function deriveColorSet(id: string): ColorSet {
  return PALETTE[hash(id) % PALETTE.length];
}

/** Class list/detail cards — always keyed by class id so colors stay consistent. */
export function classCardColorSet(classId: string): ColorSet {
  return deriveColorSet(classId);
}

/** Grade-level color — same grade name always maps to the same palette entry. */
export function deriveGradeColorSet(gradeName: string): ColorSet {
  return deriveColorSet(gradeName);
}

/** Section tiles inherit the parent grade color for visual consistency. */
export function deriveSectionColorSet(gradeName: string): ColorSet {
  return deriveGradeColorSet(gradeName);
}

/** Subject cards — same subject name always maps to the same palette entry. */
export function deriveSubjectColorSet(subject: string): ColorSet {
  return deriveColorSet(subject.trim() || 'subject');
}

/** Green / amber / red hint for attendance percentage badges. */
export function attendancePctColor(pct: number | null, hasStudents: boolean): string {
  if (!hasStudents || pct === null) return Colors.inkMuted;
  if (pct >= 80) return Colors.present;
  if (pct >= 50) return Colors.late;
  return Colors.absent;
}
