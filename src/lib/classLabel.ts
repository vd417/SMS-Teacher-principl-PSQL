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
