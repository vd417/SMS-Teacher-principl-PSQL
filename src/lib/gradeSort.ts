/**
 * Sort keys for Indian school grade/class labels: Nursery → LKG → UKG → I–XII / Class 1–12.
 * Unknown labels fall back to alphabetical order after known grades.
 */

const PRESCHOOL: Record<string, number> = {
  nursery: 0,
  lkg: 1,
  ukg: 2,
};

const ROMAN_TO_NUM: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};

type GradeKey = { tier: number; num: number; label: string };

function gradeSortKey(name: string): GradeKey {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower in PRESCHOOL) {
    return { tier: 0, num: PRESCHOOL[lower], label: lower };
  }
  if (lower.includes('nursery')) {
    return { tier: 0, num: 0, label: lower };
  }

  const classMatch = trimmed.match(/^class\s*(\d+)$/i);
  if (classMatch) {
    return { tier: 1, num: parseInt(classMatch[1], 10), label: lower };
  }

  if (/^\d+$/.test(trimmed)) {
    return { tier: 1, num: parseInt(trimmed, 10), label: lower };
  }

  const upper = trimmed.toUpperCase();
  if (ROMAN_TO_NUM[upper] !== undefined) {
    return { tier: 1, num: ROMAN_TO_NUM[upper], label: lower };
  }

  return { tier: 2, num: 0, label: lower };
}

/** Ascending compare for grade/class group keys (e.g. "Nursery", "I", "12", "Class 5"). */
export function compareGrades(a: string, b: string): number {
  const ka = gradeSortKey(a);
  const kb = gradeSortKey(b);
  if (ka.tier !== kb.tier) return ka.tier - kb.tier;
  if (ka.tier === 1 && ka.num !== kb.num) return ka.num - kb.num;
  if (ka.tier === 0 && ka.num !== kb.num) return ka.num - kb.num;
  return ka.label.localeCompare(kb.label);
}

export function sortByGrade<T>(items: T[], getGrade: (item: T) => string): T[] {
  return [...items].sort((x, y) => compareGrades(getGrade(x), getGrade(y)));
}

function sectionSortToken(section: string): string {
  const trimmed = section.trim();
  const prefixed = trimmed.match(/(?:section|sec\.?)\s*([A-Za-z0-9]+)/i);
  if (prefixed) return prefixed[1].toUpperCase();
  return trimmed.toUpperCase();
}

/** Ascending compare for section labels (A, B, C … or 1, 2, 3). */
export function compareSections(a: string, b: string): number {
  const ka = sectionSortToken(a);
  const kb = sectionSortToken(b);
  const na = parseInt(ka, 10);
  const nb = parseInt(kb, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(na) === ka && String(nb) === kb) {
    return na - nb;
  }
  return ka.localeCompare(kb);
}

export function sortBySection<T>(items: T[], getSection: (item: T) => string): T[] {
  return [...items].sort((x, y) => compareSections(getSection(x), getSection(y)));
}
