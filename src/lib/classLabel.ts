/**
 * "IV" + "B" -> "IV-B". Some classes are created upstream with the section
 * already folded into the name (e.g. name "IV-B", section "B") — appending
 * the section again would double it up ("IV-B-B"), so skip it when the name
 * already ends with the section.
 */
export function classLabel(name: string, section: string, separator = '-'): string {
  if (!section || name.endsWith(section)) return name;
  return `${name}${separator}${section}`;
}

/** "1" -> "Class 1". Some schools store a class's grade as a bare number
 * ("1".."12") rather than a label ("Class 1", "IV") — prefix it so a grade
 * group heading doesn't render as a lone, meaningless digit. */
export function gradeLabel(name: string): string {
  return /^\d+$/.test(name.trim()) ? `Class ${name.trim()}` : name;
}
